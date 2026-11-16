"use client";

/**
 * The routes the Words page writes through (CG-5) and the picture search,
 * behind a context so a preview or a test can stand in for the server.
 */

import * as React from "react";
import { searchAssets, LINKABLE_PICTURE_STATUSES, type AssetSearchPage } from "@/lib/api/assetSearch";
import { REAL_CONNECT_API } from "@/lib/connections/connectApi";
import type { ConnectApi } from "@/lib/connections/ops";

export interface WordsEditApi {
  connect: ConnectApi;
  /** `GET /assets?media=image&status=active,quarantined&q=&cursor=`. */
  searchPictures: (q: string, cursor: string | null) => Promise<AssetSearchPage>;
}

export const REAL_WORDS_EDIT_API: WordsEditApi = {
  connect: REAL_CONNECT_API,
  searchPictures: (q, cursor) => searchAssets({ media: "image", status: LINKABLE_PICTURE_STATUSES, q, cursor, limit: 48 }),
};

const Ctx = React.createContext<WordsEditApi>(REAL_WORDS_EDIT_API);
export const WordsEditApiProvider = Ctx.Provider;
export const useWordsEditApi = () => React.useContext(Ctx);
