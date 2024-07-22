/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { PhotoItem } from "@/components/photo-container";
import { FirebaseUserContext } from "@/lib/firebase-user";
import React from "react";
import PhotoAlbum, {
  Photo,
  RenderContainer,
  RenderPhoto,
  RenderRowContainer,
} from "react-photo-album";

const breakpoints = [1080, 640, 384, 256, 128, 96, 64, 48];

const AlbumContainer = (props: any) => {
  "use client";

  const photos = props.photos;
  
  const [progress, setProgress] = React.useState(0);
  const [generating, setGenerating] = React.useState(false);

  const user = React.useContext(FirebaseUserContext);
  const uid = user.currentUser?.uid;

  const renderContainer: RenderContainer = ({
    containerProps,
    children,
    containerRef,
  }) => (
    <div
      style={{
        border: "2px solid #eee",
        borderRadius: "10px",
        padding: "20px",
      }}
    >
      <div ref={containerRef} {...containerProps}>
        {children}
      </div>
    </div>
  );

  const renderRowContainer: RenderRowContainer = ({
    rowContainerProps,
    rowIndex,
    rowsCount,
    children,
  }) => (
    <>
      <div {...rowContainerProps}>{children}</div>
      {rowIndex < rowsCount - 1 && (
        <div
          style={{
            borderTop: "2px solid #eee",
            marginBottom: "20px",
          }}
        />
      )}
    </>
  );

  const renderPhoto: RenderPhoto = ({
    layoutOptions,
    imageProps: { alt, style, ...restImageProps },
    photo,
  }) => {
    const photoItem = photo as PhotoItem;
    return (
      <div
        style={{
          border: photoItem.selected ? "2px solid #0b0" : "2px solid #aaa",
          borderRadius: "4px",
          boxSizing: "content-box",
          alignItems: "center",
          width: style?.width,
          padding: `${layoutOptions.padding - 2}px`,
          paddingBottom: 0,
          backgroundColor: photoItem.selected ? "#0b0" : "#aaa",
        }}
      >
        <img
          alt={alt}
          style={{ ...style, width: "100%", padding: 0 }}
          {...restImageProps}
        />
        <div
          style={{
            paddingTop: "8px",
            paddingBottom: "8px",
            overflow: "visible",
            whiteSpace: "nowrap",
            textAlign: "center",
          }}
        ></div>
      </div>
    );
  };

  return (
    <div className="relative p-5">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {!photos ? (
          <div>Loading...</div>
        ) : photos.length > 0 ? (
          <PhotoAlbum
            layout="rows"
            photos={photos as Photo[]}
            spacing={20}
            padding={20}
            targetRowHeight={200}
            renderContainer={renderContainer}
            renderRowContainer={renderRowContainer}
            renderPhoto={renderPhoto}
          />
        ) : (
          <div>No photos to display. Add some!</div>
        )}
        <div className="flex-1 py-4"></div>
      </div>
    </div>
  );
};

export default AlbumContainer;
