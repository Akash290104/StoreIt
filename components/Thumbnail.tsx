import { cn, getFileIcon } from "@/lib/utils";
import Image from "next/image";
import React from "react";

interface Props {
  type: string;
  extension: string;
  url: string;
  imageClassName?: string;
  className?: string;
}

const Thumbnail = ({
  type,
  extension="",
  url,
  imageClassName,
  className,
}: Props) => {
  const isImage = type === "image" && extension !== "svg";

  return (
    <figure>
      <Image
        src={isImage ? url : getFileIcon(extension, type)}
        alt="file icon"
        width={100}
        height={100}
        className={cn(
          "w-20 h-20 object-cover rounded-md",
          imageClassName,
          isImage && "thumbnail-image"
        )}
      />
    </figure>
  );
};

export default Thumbnail;
