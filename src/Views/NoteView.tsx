import { TFile, moment, Keymap, PaneType } from "obsidian";
import * as React from "react";
import { useCallback } from "react";
import { getDisplayedPropertyValues } from "src/noteFilterSettings";
import { getChronologySettings } from "../main";
import { DateAttribute, NoteAttributes } from "../TimeIndex";

export const NoteView = ({ item, onOpen, extraInfo = true }:
    {
        item: NoteAttributes,
        onOpen: (note: TFile, paneType: PaneType | boolean) => void,
        extraInfo: boolean
    }) => {


    const onClick = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            const paneType = Keymap.isModEvent(event.nativeEvent);

            onOpen(item.note, paneType);
        },
        [item, onOpen]);

    const time = moment(item.time);
    const settings = getChronologySettings();
    const dateLabel = item.attribute === DateAttribute.Created ? "新建" : "修改";
    const metadata = app.metadataCache.getFileCache(item.note);
    const propertyValues = getDisplayedPropertyValues(metadata, settings.displayedProperties);

    const desc = `${item.attribute === DateAttribute.Created ? "Created" : "Modified"} ${time.format("LLL")}`;

    const linkText = app.metadataCache.fileToLinktext(item.note, "/")

    //
    // copy from onInternalLinkMouseover

    const onHover = useCallback((e:React.MouseEvent) => {
        app.workspace.trigger("hover-link", {
            event: e.nativeEvent,
            hoverParent: document.body,
            targetEl: e.currentTarget,
            linktext: linkText,
            source: "preview",
            sourcePath: "/"
        })
        // app.workspace.trigger("link-hover", 
        //      e,
        //     document.body,
        //     linkText,
        //     "/" 
        // })
    }, [linkText])

return (
    <div
        data-text={desc}
        className="chrono-temp-note tree-item nav-file"
        onClick={onClick}
        key={item.note.path}
        onMouseOver={onHover}
    >
        <span className="chrono-note-main">
            {extraInfo && time && <span className="chrono-note-time">{time.format("LT")}</span>}
            <span className="chrono-note-name">{item.note.basename}</span>
        </span>
        <span className="chrono-note-meta">
            <span className={`chrono-note-chip chrono-note-chip-${item.attribute === DateAttribute.Created ? "created" : "modified"}`}>{dateLabel}</span>
            {propertyValues.map(value => <span className="chrono-note-chip" key={`${item.note.path}-${value}`}>{value}</span>)}
        </span>


    </div>
);
};
