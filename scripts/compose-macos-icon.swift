// Composites a full-bleed square source image onto a macOS icon-grid
// canvas: 1024x1024, content sized 824x824 (80.47%), centered with 100px
// padding on each side (9.77%), clipped to a rounded rect with 186px
// corner radius (22.57% of content size) — the exact ratios already used
// by this project's own pre-existing hand-drawn icon.svg, so the result
// matches the same visual weight Finder/Dock/Launchpad expect.
import CoreGraphics
import ImageIO
import Foundation

let args = CommandLine.arguments
guard args.count == 3 else {
    FileHandle.standardError.write("Usage: swift composite.swift <input.png> <output.png>\n".data(using: .utf8)!)
    exit(1)
}
let inputPath = args[1]
let outputPath = args[2]

let canvas = 1024
let padding = 100
let contentSize = 824
let cornerRadius: CGFloat = 186

guard let dataProvider = CGDataProvider(filename: inputPath),
      let source = CGImage(pngDataProviderSource: dataProvider, decode: nil, shouldInterpolate: true, intent: .defaultIntent) else {
    FileHandle.standardError.write("Could not load \(inputPath)\n".data(using: .utf8)!)
    exit(1)
}

let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(
    data: nil, width: canvas, height: canvas, bitsPerComponent: 8, bytesPerRow: 0,
    space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    FileHandle.standardError.write("Could not create graphics context\n".data(using: .utf8)!)
    exit(1)
}
ctx.setAllowsAntialiasing(true)
ctx.interpolationQuality = .high

let contentRect = CGRect(x: padding, y: padding, width: contentSize, height: contentSize)
let path = CGPath(roundedRect: contentRect, cornerWidth: cornerRadius, cornerHeight: cornerRadius, transform: nil)
ctx.addPath(path)
ctx.clip()
ctx.draw(source, in: contentRect)

guard let outImage = ctx.makeImage() else {
    FileHandle.standardError.write("Could not render output image\n".data(using: .utf8)!)
    exit(1)
}

let url = URL(fileURLWithPath: outputPath) as CFURL
guard let dest = CGImageDestinationCreateWithURL(url, "public.png" as CFString, 1, nil) else {
    FileHandle.standardError.write("Could not create PNG destination\n".data(using: .utf8)!)
    exit(1)
}
CGImageDestinationAddImage(dest, outImage, nil)
guard CGImageDestinationFinalize(dest) else {
    FileHandle.standardError.write("Could not write \(outputPath)\n".data(using: .utf8)!)
    exit(1)
}
print("Wrote \(outputPath): \(canvas)x\(canvas), content \(contentSize)x\(contentSize) at padding \(padding), corner radius \(cornerRadius)")
