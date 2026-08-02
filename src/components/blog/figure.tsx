type FigureProps = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

export function Figure({ src, alt, caption, width, height }: FigureProps) {
  return (
    <figure className="blog-figure">
      {/* MDX figures may omit intrinsic dimensions, so a native image is intentional. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} loading="lazy" />
      {caption && <figcaption className="blog-figure__caption">{caption}</figcaption>}
    </figure>
  );
}
