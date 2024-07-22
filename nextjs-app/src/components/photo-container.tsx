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

import { FirebaseUserContext } from "@/lib/firebase-user";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  getMetadata,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import React from "react";
import PhotoAlbum, {
  Photo,
  RenderContainer,
  RenderPhoto,
  RenderRowContainer,
} from "react-photo-album";
import { FileInputContainer } from "./file-input-container";

export type PhotoItem = {
  src: string;
  width: number;
  height: number;
  selected?: boolean;
  alt?: string | null;
  id?: string;
};

const breakpoints = [1080, 640, 384, 256, 128, 96, 64, 48];

const PhotosContainer = () => {
  "use client";

  const [photos, setPhotos] = React.useState<PhotoItem[]>();
  const [progress, setProgress] = React.useState(0);
  const [generating, setGenerating] = React.useState(false);

  const user = React.useContext(FirebaseUserContext);
  const uid = user.currentUser?.uid;

  React.useEffect(() => {
    const photosCollRef = collection(getFirestore(), "photos");
    const unsubscribe = onSnapshot(photosCollRef, (querySnap) => {
      const data = querySnap.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as PhotoItem)
      );

      setPhotos(
        data.map(({ src, width, height, alt, id }) => ({
          src,
          width,
          height,
          alt: alt || null,
          id,
          selected: false,
          srcSet: breakpoints.map((breakpoint) => ({
            src: src,
            width: breakpoint,
            height: Math.round((height / width) * breakpoint),
          })),
        }))
      );
    });

    return unsubscribe;
  }, []);

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

  const MAX_NUM_TO_SELECT = 4;
  const numSelected = photos?.filter((photo) => photo?.selected).length || 0;

  const renderPhoto: RenderPhoto = ({
    layout,
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
        onClick={() => {
          if (numSelected >= MAX_NUM_TO_SELECT && !photoItem.selected) {
            return;
          }
          setPhotos((currVal) => {
            const newPhotos = currVal?.map((curr) => {
              if (curr.src === photo.src) {
                return {
                  ...curr,
                  selected:
                    curr?.selected === undefined ? true : !curr.selected,
                };
              }
              return curr;
            });
            return newPhotos;
          });
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

  const uploadImage = React.useCallback(
    async (files: File[]) => {
      const photosRefColl = collection(getFirestore(), "photos");

      for (const file of files) {
        const img = new Image();

        img.src = URL.createObjectURL(file);

        img.onload = async () => {
          const width = img.width;
          const height = img.height;
          const newUploadDocRef = doc(photosRefColl);
          const newUploadStorageRef = ref(
            getStorage(),
            `${uid}/${newUploadDocRef.id}-${file.name}`
          );

          const uploadTask = uploadBytesResumable(newUploadStorageRef, file);
          uploadTask.on("state_changed", (snapshot) => {
            setProgress(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
          });

          const uploadSnaphsot = await uploadTask;
          console.log("Upload to Storage complete", uploadSnaphsot);

          const downloadUrl = await getDownloadURL(newUploadStorageRef);
          console.log("Download URL", downloadUrl);
          if (!downloadUrl) {
            throw new Error("Download URL not found");
          }

          const newData = {
            uid,
            createTime: serverTimestamp(),
            gsUrl: newUploadStorageRef.toString(),
            src: downloadUrl,
            width,
            height,
            published: true,
          } as any;

          const metadata = await getMetadata(newUploadStorageRef);
          if (metadata.contentType) {
            newData["contentType"] = metadata.contentType;
          }

          setDoc(newUploadDocRef, newData);
        };
      }
    },
    [uid]
  );

  const handleGenerateAlbum = async () => {
    setGenerating(true);

    const selectedPhotos = photos?.filter((photo) => photo.selected);
    console.log(`selectedPhotos`, selectedPhotos);
    const albumsCollRef = collection(getFirestore(), "albums");
    try {
      await addDoc(albumsCollRef, {
        createdAt: serverTimestamp(),
        photos: selectedPhotos,
      });
    } catch (e) {
      console.log(`Error adding album`, e);
    } finally {
      setPhotos((currVal) => {
        return currVal?.map((curr) => ({
          ...curr,
          selected: false,
        }));
      });

      setGenerating(false);
    }
  };

  return (
    <div className="relative p-5">
      <div className="absolute top-5 right-5">
        <div>
          <FileInputContainer
            onFileUpload={uploadImage}
            progress={progress}
            containerClassName="w-52 h-52 border-2 border-sky-400 rounded-md place-content-center p-5"
            containerText="Drag 'n' drop some photos here"
            maxFiles={4}
            multiple={true}
          />
        </div>
        <div className="grid justify-items-center p-5">
          {numSelected === 0 ? (
            <button
              disabled={true}
              className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm text-black font-medium rounded-lg group focus:ring-4 focus:outline-none"
            >
              <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-400 rounded-md w-44">
                Select some photos
              </span>
            </button>
          ) : (
            <button
              className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-500 to-pink-500 group-hover:from-purple-500 group-hover:to-pink-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-purple-800"
              disabled={generating}
              onClick={handleGenerateAlbum}
            >
              <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0  w-44">
                {generating && (
                  <svg
                    aria-hidden="true"
                    role="status"
                    className="inline w-4 h-4 me-3 text-white animate-spin"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="#E5E7EB"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentColor"
                    />
                  </svg>
                )}{" "}
                Create My Album
              </span>
            </button>
          )}
        </div>
      </div>
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

export default PhotosContainer;
