import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/content/site";

// A route handler rather than the `opengraph-image` convention, whose output has no file extension:
// GitHub Pages picks the Content-Type from the extension, and link-preview crawlers want image/png.
export const dynamic = "force-static";

const size = { width: 1200, height: 630 };

const dataUri = async (path: string, type: string) =>
  `data:${type};base64,${(await readFile(join(process.cwd(), path))).toString("base64")}`;

/** Link preview for LinkedIn, iMessage, Slack and the like, rendered once at build time. */
export async function GET() {
  const [avatar, ray] = await Promise.all([
    dataUri(`public${site.avatar}`, "image/jpeg"),
    dataUri("src/app/icon.png", "image/png"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 96px",
        background: "#ffffff",
        color: "#0f172a",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 92, letterSpacing: -3 }}>{site.name}</div>
        <div style={{ fontSize: 40, marginTop: 12, color: "#475569" }}>{`${site.jobTitle} at Toma`}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 56, fontSize: 30, color: "#2f4fc4" }}>
          {/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain <img>, not next/image */}
          <img src={ray} width={56} height={56} alt="" style={{ marginRight: 16 }} />
          rayhuang.us
        </div>
      </div>
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain <img>, not next/image */}
      <img
        src={avatar}
        width={320}
        height={320}
        alt=""
        style={{ borderRadius: 160, border: "1px solid #e2e8f0" }}
      />
    </div>,
    size,
  );
}
