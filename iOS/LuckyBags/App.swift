import UIKit
import WebKit

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
    private func saveURL() throws -> URL {
        let base = try FileManager.default.url(for: .applicationSupportDirectory,
                                                in: .userDomainMask, appropriateFor: nil, create: true)
        return base.appendingPathComponent("lucky-bags-v1.json")
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
        do {
            switch operation {
            case "read":
                let data = try currentData(at: saveURL())
                if let data = data {
                    guard let raw = String(data: data, encoding: .utf8) else { throw CocoaError(.fileReadCorruptFile) }
                    replyHandler(raw, nil)
                } else {
                    replyHandler(NSNull(), nil)
                }
            case "write":
                guard let raw = body["raw"] as? String, let expected = body["expected"] as? Int else {
                    replyHandler(nil, "Invalid save")
                    return
                }
                let url = try saveURL()
                let old = try currentData(at: url)
                let oldRevision = try old.map { try revision(of: $0) } ?? 0
                let data = Data(raw.utf8)
                guard oldRevision == expected, try revision(of: data) == expected + 1 else {
                    replyHandler("conflict", nil)
                    return
                }
                try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
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
