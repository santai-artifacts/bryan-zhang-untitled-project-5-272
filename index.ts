import sharp from "sharp";

const publicDir = `${import.meta.dir}/public`;

export default {
  port: process.env.PORT || 3000,
  async fetch(req: Request) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response(Bun.file(`${publicDir}/index.html`), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/convert" && req.method === "POST") {
      try {
        const formData = await req.formData();
        const file = formData.get("image") as File;

        if (!file) {
          return Response.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const png = await sharp(buffer).png().toBuffer();
        const baseName = file.name.replace(/\.[^/.]+$/, "");

        return new Response(png, {
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition": `attachment; filename="${baseName}.png"`,
          },
        });
      } catch (err) {
        console.error("Conversion error:", err);
        return Response.json({ error: "Conversion failed" }, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
