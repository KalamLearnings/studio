"use client";

/** "Kinds of connection": the legend, every kind explained in one sentence. */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CONNECTION_KINDS, NODE_KINDS } from "@/lib/connections/kinds";
import { NODE_TYPES } from "@/lib/connections/keys";
import { Badge, CONNECTION_COLOR, KIND_COLOR, KindIcon } from "./parts";
import s from "./words.module.css";

export function KindsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          Kinds of connection
        </Button>
      </DialogTrigger>
      <DialogContent className={`${s.tokens} max-h-[86vh] max-w-xl overflow-auto`}>
        <DialogHeader>
          <DialogTitle>Kinds of item</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {NODE_TYPES.map((t) => (
            <div key={t} className="flex items-center gap-2 text-sm">
              <span style={{ color: KIND_COLOR[t] }}>
                <KindIcon type={t} size={16} />
              </span>
              <b className="font-semibold">{NODE_KINDS[t].name}</b>
            </div>
          ))}
        </div>
        <h3 className="mt-3 text-base font-semibold">Kinds of connection</h3>
        <DialogDescription>
          Solid lines are connections people make. Dashed lines with a lock are worked out from elsewhere; the box says where to change them.
        </DialogDescription>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {(Object.keys(CONNECTION_KINDS) as Array<keyof typeof CONNECTION_KINDS>).map((k) => {
            const K = CONNECTION_KINDS[k];
            return (
              <div key={k} className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="mt-[9px] w-[22px] shrink-0 border-t-[3px]"
                  style={{ borderColor: CONNECTION_COLOR[k], borderTopStyle: K.editable ? "solid" : "dashed" }}
                />
                <span>
                  <b className="font-semibold">{K.name}</b> {!K.editable && <Badge>worked out</Badge>}
                  <br />
                  <span className="text-xs text-muted-foreground">{K.explain}</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Meanings are not linked to each other.</p>
      </DialogContent>
    </Dialog>
  );
}
