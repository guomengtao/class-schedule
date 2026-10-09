import Vision
import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 2 else { exit(1) }
let imgPath = args[1]

guard let img = NSImage(contentsOfFile: imgPath),
      let cgImg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }

let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.recognitionLanguages = ["zh-Hans", "en"]

let handler = VNImageRequestHandler(cgImage: cgImg, options: [:])
try handler.perform([req])

for obs in (req.results as? [VNRecognizedTextObservation] ?? []) {
    guard let top = obs.topCandidates(1).first else { continue }
    let bb = obs.boundingBox
    print("TEXT:\(top.string)|BBOX:\(bb.origin.x),\(bb.origin.y),\(bb.size.width),\(bb.size.height)")
}