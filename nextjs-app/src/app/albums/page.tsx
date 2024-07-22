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

"use client";
import { PhotoItem } from "@/components/photo-container";
import { FirebaseUserContext } from "@/lib/firebase-user";
import {
  collection,
  getFirestore,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import React from "react";

type Album = {
  description?: string | null;
  createdAt?: Timestamp | null;
  photos?: PhotoItem[];
  id?: string;
};

const AlbumsContainer = () => {
  const [albums, setAlbums] = React.useState<Album[]>();

  const user = React.useContext(FirebaseUserContext);
  const uid = user.currentUser?.uid;

  React.useEffect(() => {
    const albumCollRef = collection(getFirestore(), "albums");
    const unsubscribe = onSnapshot(albumCollRef, (querySnap) => {
      const data = querySnap.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as Album)
      );

      setAlbums(data);
    });

    return unsubscribe;
  }, []);

  return (
    <div className="relative p-5">
      <div className="flex-1 flex flex-col max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <table className="table-fixed">
          <thead>
            <tr>
              <th className="border border-slate-600 text-white">Date</th>
              <th className="border border-slate-600 text-white">Num Photos</th>
              <th className="border border-slate-600 text-white">Synopsis</th>
            </tr>
          </thead>
          <tbody>
            {!albums ? (
              <div>Loading...</div>
            ) : albums.length > 0 ? (
              albums.map(({ createdAt, description, id, photos }, index) => (
                <tr key={id}>
                  <td className="border border-slate-700 text-slate-300">
                    {createdAt?.toDate().toLocaleString() ?? "<No date>"}
                  </td>
                  <td className="border border-slate-700 text-slate-300 text-center">
                    {photos?.length ?? "<No photos>"}
                  </td>
                  <td className="border border-slate-700 text-slate-300">
                    {description ?? "<No description>"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="border border-slate-700 text-white text-lg text-center py-5"
                >
                  No albums to display. Add some!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlbumsContainer;
