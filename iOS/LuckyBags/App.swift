import StoreKit
import UIKit
import WebKit

/// The one-time purchase that opens chapters two to ten. Chapter one is free.
@MainActor
final class FullGameStore {
    static let productID = "com.luckybags.pixelshop.fullgame"
    var onChange: (() -> Void)?
    private var updates: Task<Void, Never>?
    private var product: Product?

    init() {
        // Purchases approved later (Ask to Buy, pending payments) and refunds arrive here.
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                guard case .verified(let transaction) = result else { continue }
                await transaction.finish()
                if transaction.productID == Self.productID { self?.onChange?() }
            }
        }
    }

    deinit { updates?.cancel() }

    func owned() async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.productID == Self.productID,
               transaction.revocationDate == nil {
                return true
            }
        }
        return false
    }

    private func loadProduct() async throws -> Product? {
        if let product { return product }
        product = try await Product.products(for: [Self.productID]).first
        return product
    }

    func price() async -> String? {
        try? await loadProduct()?.displayPrice
    }

    func purchase() async -> String {
        do {
            guard let product = try await loadProduct() else { return "unavailable" }
            switch try await product.purchase() {
            case .success(.verified(let transaction)):
                await transaction.finish()
                return "owned"
            case .success(.unverified):
                return "failed"
            case .userCancelled:
                return "cancelled"
            case .pending:
                return "pending"
            @unknown default:
                return "failed"
            }
        } catch {
            return "failed"
        }
    }

    func restore() async -> String {
        do { try await AppStore.sync() } catch { return "failed" }
        return await owned() ? "owned" : "none"
    }
}

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     configurationForConnecting session: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "LuckyBags", sessionRole: session.role)
        configuration.delegateClass = GameScene.self
        return configuration
    }
}

final class GameScene: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = GameController()
        self.window = window
        window.makeKeyAndVisible()
    }
}

/// Each message runs on the main actor. The revision check and atomic file
/// replacement form one transaction, including the order and its earnings.
final class StoreBridge: NSObject, WKScriptMessageHandlerWithReply {
    let fullGame = FullGameStore()
    private func saveURL(_ slot: String = "current") throws -> URL {
        let base = try FileManager.default.url(for: .applicationSupportDirectory,
                                                in: .userDomainMask, appropriateFor: nil, create: true)
        guard ["current", "backup", "orders-a", "orders-b"].contains(slot) else {
            throw CocoaError(.fileReadInvalidFileName)
        }
        let suffix = slot == "current" ? "" : "-" + slot
        return base.appendingPathComponent("lucky-bags-v1" + suffix + ".json")
    }

    private func currentData(at url: URL) throws -> Data? {
        do {
            return try Data(contentsOf: url)
        } catch let error as NSError where error.domain == NSCocoaErrorDomain && error.code == NSFileReadNoSuchFileError {
            return nil
        }
    }

    private func revision(of data: Data) throws -> Int {
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let rev = json["revision"] as? Int, json["format"] as? Int == 1 else {
            throw CocoaError(.fileReadCorruptFile)
        }
        return rev
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true,
              let body = message.body as? [String: Any], let operation = body["op"] as? String else {
            replyHandler(nil, "Invalid request")
            return
        }
        if operation.hasPrefix("store-") || operation == "purchase" || operation == "restore" {
            Task { @MainActor in
                switch operation {
                case "store-status": replyHandler(await fullGame.owned() ? "owned" : "none", nil)
                case "store-price":
                    let price = await fullGame.price()
                    replyHandler(price.map { $0 as Any } ?? NSNull(), nil)
                case "purchase": replyHandler(await fullGame.purchase(), nil)
                case "restore": replyHandler(await fullGame.restore(), nil)
                default: replyHandler(nil, "Unknown operation")
                }
            }
            return
        }
        do {
            switch operation {
            case "read":
                let data = try currentData(at: saveURL(body["slot"] as? String ?? "current"))
                if let data { replyHandler(String(decoding: data, as: UTF8.self), nil) }
                else { replyHandler(NSNull(), nil) }
            case "restore":
                let url = try saveURL()
                let current = try currentData(at: url).map { String(decoding: $0, as: UTF8.self) }
                guard let raw = body["raw"] as? String, current == body["observed"] as? String,
                      try currentData(at: saveURL("backup")) == Data(raw.utf8) else {
                    replyHandler("conflict", nil)
                    return
                }
                try Data(raw.utf8).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                replyHandler("ok", nil)
            case "write":
                guard let raw = body["raw"] as? String, let expected = body["expected"] as? Int else {
                    replyHandler(nil, "Invalid save")
                    return
                }
                let url = try saveURL()
                let old = try currentData(at: url)
                let data = Data(raw.utf8)
                guard try (old.map { try revision(of: $0) } ?? 0) == expected,
                      try revision(of: data) == expected + 1 else {
                    replyHandler("conflict", nil)
                    return
                }
                let options: Data.WritingOptions = [.atomic, .completeFileProtectionUntilFirstUserAuthentication]
                if let old { try old.write(to: saveURL("backup"), options: options) }
                if let archive = body["archive"] as? String {
                    guard let slot = body["slot"] as? String, ["orders-a", "orders-b"].contains(slot) else {
                        throw CocoaError(.fileWriteInvalidFileName)
                    }
                    try Data(archive.utf8).write(to: saveURL(slot), options: options)
                }
                try data.write(to: url, options: options)
                replyHandler("ok", nil)
            case "haptic":
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                replyHandler("ok", nil)
            default:
                replyHandler(nil, "Unknown operation")
            }
        } catch {
            replyHandler(nil, error.localizedDescription)
        }
    }
}

final class GameController: UIViewController, WKNavigationDelegate {
    private let bridge = StoreBridge()
    private var webView: WKWebView!
    private var gameRoot: URL?
    override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        let paper = UIColor(red: 1, green: 0.96, blue: 0.87, alpha: 1)
        view.backgroundColor = paper
        let config = WKWebViewConfiguration()
        config.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "lucky")
        config.mediaTypesRequiringUserActionForPlayback = []
        let web = WKWebView(frame: view.bounds, configuration: config)
        webView = web
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.isOpaque = false
        web.backgroundColor = paper
        web.scrollView.backgroundColor = paper
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.navigationDelegate = self
        view.addSubview(web)
        bridge.fullGame.onChange = { [weak web] in
            web?.evaluateJavaScript("dispatchEvent(new Event('lucky-store'))")
        }
        loadGame()
    }

    private func loadGame() {
        guard let start = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Game") else {
            let label = UILabel(frame: view.bounds.insetBy(dx: 24, dy: 0))
            label.text = "游戏资源未完整安装。"
            label.textAlignment = .center
            view.addSubview(label)
            return
        }
        let directory = start.deletingLastPathComponent()
        gameRoot = directory
        webView.loadFileURL(start, allowingReadAccessTo: directory)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, url.isFileURL,
              let base = gameRoot?.standardizedFileURL.path,
              url.standardizedFileURL.path.hasPrefix(base + "/") else {
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { loadGame() }
}
