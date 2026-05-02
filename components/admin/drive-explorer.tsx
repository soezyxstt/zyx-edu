"use client";

import { DropdownMenu } from "radix-ui";
import {
  ChevronDown,
  ChevronRight,
  FileIcon,
  FileText,
  Folder,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  PencilLine,
  Plus,
  Trash2,
  Upload,
  ImageIcon,
  HardDrive,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

import {
  driveCreateFolder,
  driveDeleteItem,
  driveDeleteItems,
  driveMoveItems,
  driveRenameItem,
} from "@/app/admin/files/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UploadButton } from "@/lib/uploadthing";
import type { FolderNode } from "@/lib/drive";
import { cn } from "@/lib/utils";

const DND_MIME = "application/x-zyx-drive-items";

export type DriveRow = {
  id: string;
  parentId: string | null;
  kind: "folder" | "file";
  name: string;
  ufsUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  updatedAt: string;
};

export type DriveBreadcrumb = { id: string | null; name: string };

type DriveExplorerProps = {
  tree: FolderNode[];
  rows: DriveRow[];
  breadcrumbs: DriveBreadcrumb[];
  currentFolderId: string | null;
};

function formatBytes(bytes: number | null) {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v < 10 && u > 0 ? v.toFixed(1) : Math.round(v)} ${units[u]}`;
}

function fileKindIcon(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return ImageIcon;
  return FileText;
}

function allFolderIds(nodes: FolderNode[]): Set<string> {
  const s = new Set<string>();
  const walk = (ns: FolderNode[]) => {
    for (const n of ns) {
      s.add(n.id);
      walk(n.children);
    }
  };
  walk(nodes);
  return s;
}

function findFolderNode(nodes: FolderNode[], id: string): FolderNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findFolderNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

function forbiddenMoveTargets(selectedIds: Set<string>, rows: DriveRow[], tree: FolderNode[]): Set<string> {
  const forbidden = new Set<string>();
  for (const sid of selectedIds) {
    const row = rows.find((r) => r.id === sid);
    if (row?.kind !== "folder") continue;
    const node = findFolderNode(tree, sid);
    if (!node) continue;
    const walk = (n: FolderNode) => {
      forbidden.add(n.id);
      for (const c of n.children) walk(c);
    };
    walk(node);
  }
  return forbidden;
}

/** Remote patterns for UF — avoid Next/Image optimizer config for uploads. */
function GridThumb({ ufsUrl, name, mimeType }: { ufsUrl: string; name: string; mimeType: string | null }) {
  const isSvg = mimeType === "image/svg+xml";
  const showImage = mimeType?.startsWith("image/") && ufsUrl && !isSvg;

  let fallbackIcon: ReactNode;
  if (mimeType?.startsWith("image/")) {
    fallbackIcon = <ImageIcon className="text-muted-foreground size-10 opacity-60" aria-hidden />;
  } else if (mimeType) {
    fallbackIcon = <FileText className="text-muted-foreground size-10 opacity-60" aria-hidden />;
  } else {
    fallbackIcon = <FileIcon className="text-muted-foreground size-10 opacity-60" aria-hidden />;
  }

  return (
    <div className="bg-muted relative flex aspect-photo-card w-full items-center justify-center overflow-hidden rounded-lg border border-border/80">
      {showImage ? (
        <Image
          src={ufsUrl}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
          unoptimized
        />
      ) : (
        fallbackIcon
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}

function FolderTreeNodes({
  nodes,
  depth,
  currentFolderId,
  expandedIds,
  onToggleExpand,
  onPick,
  dropTargetId,
  onDragOverFolder,
  onDropOnFolder,
}: {
  nodes: FolderNode[];
  depth: number;
  currentFolderId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onPick: (id: string) => void;
  dropTargetId: string | null;
  onDragOverFolder: (e: React.DragEvent, folderId: string) => void;
  onDropOnFolder: (e: React.DragEvent, folderId: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const selected = node.id === currentFolderId;
        const hasKids = node.children.length > 0;
        const open = expandedIds.has(node.id);
        const isDropTarget = dropTargetId === node.id;

        return (
          <div key={node.id}>
            <div
              className={cn(
                "flex w-full items-stretch rounded-md transition-colors",
                isDropTarget && "bg-brand-primary/12 ring-ring/50 ring-2 ring-offset-1",
              )}
            >
              {hasKids ? (
                <button
                  type="button"
                  className={cn(
                    "text-muted-foreground hover:bg-muted/80 shrink-0 cursor-pointer rounded-l-md px-1 py-1.5 outline-none transition-colors",
                    selected && "text-brand-primary",
                  )}
                  aria-label={open ? "Collapse folder" : "Expand folder"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(node.id);
                  }}
                >
                  <ChevronRight
                    className={cn("size-4 transition-transform", open && "rotate-90")}
                    aria-hidden
                  />
                </button>
              ) : (
                <span className="w-6 shrink-0" aria-hidden />
              )}
              <button
                type="button"
                style={{ paddingLeft: Math.max(0, depth * 6) }}
                className={cn(
                  "hover:bg-muted/80 mb-0.5 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-r-md rounded-l-none py-1.5 pr-2 text-left text-body-sm outline-none transition-colors",
                  selected &&
                    "bg-brand-primary/8 border-brand-primary/15 text-brand-primary border font-medium",
                )}
                onDragOver={(e) => onDragOverFolder(e, node.id)}
                onDrop={(e) => onDropOnFolder(e, node.id)}
                onClick={() => onPick(node.id)}
              >
                <Folder
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0",
                    selected ? "text-brand-secondary" : "text-status-warning/90",
                  )}
                />
                <span className="truncate">{node.name}</span>
              </button>
            </div>
            {hasKids && open ? (
              <FolderTreeNodes
                depth={depth + 1}
                nodes={node.children}
                currentFolderId={currentFolderId}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onPick={onPick}
                dropTargetId={dropTargetId}
                onDragOverFolder={onDragOverFolder}
                onDropOnFolder={onDropOnFolder}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function DriveExplorer({ tree, rows, breadcrumbs, currentFolderId }: DriveExplorerProps) {
  const router = useRouter();
  const [dialogBusy, setDialogBusy] = useState(false);

  const [view, setView] = useState<"list" | "grid">("list");
  const [foldersRailOpen, setFoldersRailOpen] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const all = allFolderIds(tree);
    setExpandedIds((prev) => {
      if (prev.size === 0) return all;
      const next = new Set(prev);
      for (const id of all) next.add(id);
      return next;
    });
  }, [tree]);

  const toggleExpandFolder = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionAnchor = useRef<number | null>(null);
  const selectedRef = useRef(selectedIds);
  selectedRef.current = selectedIds;

  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameRow, setRenameRow] = useState<DriveRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<DriveRow | null>(null);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetParentId, setMoveTargetParentId] = useState<string | null>(null);

  const forbiddenMove = useMemo(
    () => forbiddenMoveTargets(selectedIds, rows, tree),
    [selectedIds, rows, tree],
  );

  const goFolder = (id: string | null) => {
    const q = id ? `?folder=${encodeURIComponent(id)}` : "";
    router.push(`/admin/files${q}`);
  };

  const refreshList = () => {
    router.refresh();
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    selectionAnchor.current = null;
  };

  const parseDragPayload = (e: React.DragEvent): string[] => {
    const raw = e.dataTransfer?.getData(DND_MIME);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as { ids?: unknown };
      if (!Array.isArray(parsed.ids)) return [];
      return parsed.ids.filter((x): x is string => typeof x === "string" && x.length > 0);
    } catch {
      return [];
    }
  };

  const onDragRowStart = useCallback((e: React.DragEvent, row: DriveRow) => {
    const s = selectedRef.current;
    const ids = s.has(row.id) ? [...s] : [row.id];
    e.dataTransfer.setData(DND_MIME, JSON.stringify({ ids }));
    e.dataTransfer.effectAllowed = "move";
    if (typeof document !== "undefined") {
      document.body.dataset.driveDragging = "1";
    }
  }, []);

  useEffect(() => {
    const end = () => {
      delete document.body.dataset.driveDragging;
      setDropTargetId(null);
    };
    window.addEventListener("dragend", end);
    window.addEventListener("drop", end);
    return () => {
      window.removeEventListener("dragend", end);
      window.removeEventListener("drop", end);
    };
  }, []);

  const dragOverAccept = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types?.includes?.(DND_MIME)) return false;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    return true;
  }, []);

  async function dropIdsToFolder(ids: string[], targetParentId: string | null) {
    if (!ids.length) return;
    setDialogBusy(true);
    try {
      const res = await driveMoveItems({ ids, targetParentId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(ids.length === 1 ? "Moved." : `${ids.length} items moved.`);
      clearSelection();
      refreshList();
    } finally {
      setDialogBusy(false);
      setDropTargetId(null);
    }
  }

  const onTreeDragOver = useCallback(
    (e: React.DragEvent, folderId: string) => {
      if (!dragOverAccept(e)) return;
      setDropTargetId(folderId);
    },
    [dragOverAccept],
  );

  const onRootDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dragOverAccept(e)) return;
      setDropTargetId("__root__");
    },
    [dragOverAccept],
  );

  async function onDropOnFolderTree(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    if (!e.dataTransfer.types.includes(DND_MIME)) return;
    const ids = parseDragPayload(e);
    if (!ids.length) return;
    await dropIdsToFolder(ids, folderId);
  }

  async function onDropRoot(e: React.DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer.types.includes(DND_MIME)) return;
    const ids = parseDragPayload(e);
    if (!ids.length) return;
    await dropIdsToFolder(ids, null);
  }

  const onRowDragOverFolder = useCallback(
    (e: React.DragEvent, folderId: string) => {
      if (!dragOverAccept(e)) return;
      setDropTargetId(folderId);
    },
    [dragOverAccept],
  );

  async function onDropOnFolderRow(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    if (!e.dataTransfer.types.includes(DND_MIME)) return;
    const ids = parseDragPayload(e);
    if (!ids.length) return;
    await dropIdsToFolder(ids, folderId);
  }

  useEffect(() => {
    setSelectedIds(new Set());
    selectionAnchor.current = null;
  }, [currentFolderId]);

  const handleRowMouseDown = (e: React.MouseEvent, row: DriveRow, index: number) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(row.id)) next.delete(row.id);
        else next.add(row.id);
        return next;
      });
      selectionAnchor.current = index;
      return;
    }
    if (e.shiftKey && rows.length) {
      e.preventDefault();
      const anchor = selectionAnchor.current ?? index;
      const lo = Math.min(anchor, index);
      const hi = Math.max(anchor, index);
      const next = new Set<string>();
      for (let i = lo; i <= hi; i += 1) next.add(rows[i]!.id);
      setSelectedIds(next);
      selectionAnchor.current = anchor;
    }
  };

  /** Single-click opens; selection is only checkbox or Ctrl / Shift modifiers. */
  function handleOpenActivate(e: React.MouseEvent | React.KeyboardEvent, row: DriveRow) {
    if ("key" in e) {
      if (e.key !== "Enter") return;
    } else if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
      return;
    }

    const targetEl = e.target instanceof HTMLElement ? e.target : null;
    if (
      targetEl &&
      (targetEl.closest("input[type='checkbox']") ||
        targetEl.closest("button") ||
        targetEl.closest('[data-slot="button"]'))
    ) {
      return;
    }

    if (row.kind === "folder") goFolder(row.id);
    else if (row.ufsUrl) window.open(row.ufsUrl, "_blank", "noopener,noreferrer");
  }

  const toggleCheckbox = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const allSelectableIds = rows.map((r) => r.id);
  const allSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) clearSelection();
    else setSelectedIds(new Set(allSelectableIds));
  };

  const onCreateFolder = async () => {
    setDialogBusy(true);
    try {
      const res = await driveCreateFolder({
        parentId: currentFolderId,
        name: newFolderName,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Folder created.");
      setNewFolderName("");
      setCreateOpen(false);
      refreshList();
    } finally {
      setDialogBusy(false);
    }
  };

  const openRename = (row: DriveRow) => {
    setRenameRow(row);
    setRenameName(row.name);
    setRenameOpen(true);
  };

  const onRenameConfirm = async () => {
    if (!renameRow) return;
    setDialogBusy(true);
    try {
      const res = await driveRenameItem({ id: renameRow.id, name: renameName });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Renamed.");
      setRenameOpen(false);
      setRenameRow(null);
      refreshList();
    } finally {
      setDialogBusy(false);
    }
  };

  const openDelete = (row: DriveRow) => {
    setDeleteRow(row);
    setDeleteOpen(true);
  };

  const onDeleteConfirm = async () => {
    if (!deleteRow) return;
    setDialogBusy(true);
    try {
      const res = await driveDeleteItem({ id: deleteRow.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(deleteRow.kind === "folder" ? "Folder deleted." : "File deleted.");
      setDeleteOpen(false);
      setDeleteRow(null);
      refreshList();
    } finally {
      setDialogBusy(false);
    }
  };

  const onBatchDeleteConfirm = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setDialogBusy(true);
    try {
      const res = await driveDeleteItems({ ids });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(ids.length === 1 ? "Deleted." : `${ids.length} items deleted.`);
      setBatchDeleteOpen(false);
      clearSelection();
      refreshList();
    } finally {
      setDialogBusy(false);
    }
  };

  const openMoveDialog = () => {
    if (selectedIds.size === 0) return;
    setMoveTargetParentId(null);
    setMoveDialogOpen(true);
  };

  const onMoveDialogConfirm = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setDialogBusy(true);
    try {
      const res = await driveMoveItems({ ids, targetParentId: moveTargetParentId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(ids.length === 1 ? "Moved." : `${ids.length} items moved.`);
      setMoveDialogOpen(false);
      clearSelection();
      refreshList();
    } finally {
      setDialogBusy(false);
    }
  };

  function MovePickerNodes({
    nodes,
    depth,
    forbidden,
  }: {
    nodes: FolderNode[];
    depth: number;
    forbidden: Set<string>;
  }) {
    return (
      <>
        {nodes.map((node) => {
          const disabled = forbidden.has(node.id);
          const picked = moveTargetParentId === node.id;
          return (
            <div key={node.id} className="space-y-0.5">
              <button
                type="button"
                disabled={disabled}
                style={{ paddingLeft: 8 + depth * 14 }}
                className={cn(
                  "hover:bg-muted/80 flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-body-sm transition-colors",
                  picked && "bg-brand-primary/10 text-brand-primary font-medium",
                  disabled && "text-muted-foreground cursor-not-allowed opacity-50",
                )}
                onClick={() => !disabled && setMoveTargetParentId(node.id)}
              >
                <Folder className="text-status-warning size-4 shrink-0" aria-hidden />
                <span className="truncate">{node.name}</span>
              </button>
              {node.children.length ? (
                <MovePickerNodes nodes={node.children} depth={depth + 1} forbidden={forbidden} />
              ) : null}
            </div>
          );
        })}
      </>
    );
  }

  const rootDropActive = dropTargetId === "__root__";

  return (
    <>
      <div className="border-border flex min-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:flex-row">
        <aside className="border-border bg-muted/20 border-b lg:border-border lg:border-b-0 lg:w-60 lg:shrink-0 lg:min-h-0">
          <button
            type="button"
            className="border-border hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between border-b px-3 py-2.5 text-left outline-none"
            onClick={() => setFoldersRailOpen((o) => !o)}
            aria-expanded={foldersRailOpen}
          >
            <p className="text-body-xs text-muted-foreground font-medium tracking-wide uppercase">Folders</p>
            <ChevronDown
              className={cn("text-muted-foreground size-4 transition-transform", foldersRailOpen ? "rotate-180" : "")}
              aria-hidden
            />
          </button>
          {foldersRailOpen ? (
            <nav
              className="max-h-[40vh] overflow-y-auto px-2 py-2 lg:max-h-none"
              aria-label="Folder tree"
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setDropTargetId(null);
              }}
            >
              <button
                type="button"
                className={cn(
                  "mb-1 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-body-sm outline-none transition-colors",
                  currentFolderId === null && "bg-brand-primary/8 text-brand-primary border-brand-primary/15 border font-medium",
                  rootDropActive && "bg-brand-primary/12 ring-ring/50 ring-2 ring-offset-1",
                )}
                onClick={() => goFolder(null)}
                onDragOver={onRootDragOver}
                onDrop={onDropRoot}
              >
                <HardDrive
                  className={cn(
                    "size-4 shrink-0",
                    currentFolderId === null ? "text-brand-primary" : "text-muted-foreground",
                  )}
                />
                My Drive
              </button>
              <FolderTreeNodes
                depth={0}
                nodes={tree}
                currentFolderId={currentFolderId}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpandFolder}
                onPick={(id) => goFolder(id)}
                dropTargetId={dropTargetId}
                onDragOverFolder={onTreeDragOver}
                onDropOnFolder={onDropOnFolderTree}
              />
            </nav>
          ) : null}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="border-border bg-background/90 flex flex-col gap-2 border-b px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-body-sm text-muted-foreground flex min-w-0 flex-wrap items-center gap-1 truncate">
                {breadcrumbs.map((seg, i) => (
                  <Fragment key={`${seg.id ?? "root"}-${i}`}>
                    {i > 0 ? <ChevronRight className="text-muted-foreground mx-0.5 size-3 shrink-0" aria-hidden /> : null}
                    <button
                      type="button"
                      className={cn(
                        "hover:text-brand-primary max-w-40 truncate rounded px-1 text-left underline-offset-2 hover:underline sm:max-w-xs",
                        i === breadcrumbs.length - 1 ? "text-foreground font-medium" : "",
                      )}
                      onClick={() => goFolder(seg.id)}
                      onDragOver={(e) => {
                        if (seg.id && dragOverAccept(e)) setDropTargetId(seg.id);
                      }}
                      onDrop={(e) => {
                        if (!seg.id) return;
                        void onDropOnFolderRow(e, seg.id);
                      }}
                    >
                      {seg.name}
                    </button>
                  </Fragment>
                ))}
              </div>
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5">
                <div className="border-border flex rounded-lg border p-0.5">
                  <button
                    type="button"
                    className={cn(
                      "cursor-pointer rounded-md p-1.5 outline-none transition-colors",
                      view === "list" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={view === "list"}
                    aria-label="List view"
                    onClick={() => setView("list")}
                  >
                    <List className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "cursor-pointer rounded-md p-1.5 outline-none transition-colors",
                      view === "grid" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={view === "grid"}
                    aria-label="Grid view"
                    onClick={() => setView("grid")}
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)} disabled={dialogBusy}>
                  <Plus className="size-3.5" aria-hidden />
                  New folder
                </Button>
                <UploadButton
                  endpoint="driveUploader"
                  input={{ parentId: currentFolderId }}
                  appearance={{
                    container: "inline-flex justify-end",
                    button: cn(
                      buttonVariants({ variant: "default", size: "sm" }),
                      "shadow-none hover:shadow-sm",
                    ),
                    allowedContent: "text-muted-foreground hidden sm:block text-[10px] leading-tight",
                  }}
                  content={{
                    button: () => (
                      <>
                        <Upload className="size-3.5" aria-hidden />
                        Upload
                      </>
                    ),
                  }}
                  onClientUploadComplete={() => {
                    toast.success("Uploaded.");
                    refreshList();
                  }}
                  onUploadError={(err: Error) => {
                    toast.error(err.message ?? "Upload failed.");
                  }}
                />
              </div>
            </div>
            {selectedIds.size > 0 ? (
              <div className="bg-muted/60 flex flex-wrap items-center gap-2 rounded-lg border border-border/80 px-2 py-1.5 text-body-sm">
                <span className="text-muted-foreground pl-1">
                  {selectedIds.size} selected
                </span>
                <Button variant="ghost" size="xs" type="button" onClick={clearSelection}>
                  Clear
                </Button>
                <Button variant="outline" size="xs" type="button" className="gap-1" onClick={openMoveDialog} disabled={dialogBusy}>
                  <Folder className="size-3.5" aria-hidden />
                  Move to…
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  type="button"
                  className="gap-1"
                  onClick={() => setBatchDeleteOpen(true)}
                  disabled={dialogBusy}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete
                </Button>
              </div>
            ) : null}
          </header>

          <div className="min-h-[240px] flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-24 text-center">
                <Folder className="text-muted-foreground size-14 opacity-50" aria-hidden />
                <p className="font-heading text-h6 text-foreground">This folder is empty</p>
                <p className="text-muted-foreground text-body-sm max-w-xs">
                  Click a folder or file to open it. Tick the corner checkbox, or Ctrl/Shift‑click rows, to select for move
                  or delete. Drag onto a sidebar folder to move.
                </p>
              </div>
            ) : view === "list" ? (
              <table className="w-full min-w-[640px] border-collapse text-left text-body-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground border-b">
                    <th className="font-medium w-10 px-2 py-2.5" scope="col">
                      <input
                        type="checkbox"
                        className="border-border accent-brand-primary size-3.5 cursor-pointer rounded border"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="font-medium px-2 py-2.5 w-[48%]" scope="col">
                      Name
                    </th>
                    <th className="font-medium px-4 py-2.5 whitespace-nowrap" scope="col">
                      Modified
                    </th>
                    <th className="font-medium px-4 py-2.5 whitespace-nowrap" scope="col">
                      Size
                    </th>
                    <th className="sr-only" scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const FileIco = row.kind === "file" ? fileKindIcon(row.mimeType) : Folder;
                    const isSelected = selectedIds.has(row.id);
                    const rowDrop = row.kind === "folder" && dropTargetId === row.id;
                    return (
                      <tr
                        key={row.id}
                        draggable
                        onDragStart={(e) => onDragRowStart(e, row)}
                        className={cn(
                          "border-border border-b last:border-b-0 transition-colors",
                          isSelected && "bg-brand-primary/6",
                          rowDrop && "bg-brand-primary/12 ring-brand-primary/25 ring-1 ring-inset",
                        )}
                        onMouseDown={(e) => handleRowMouseDown(e, row, index)}
                        onClick={(e) => handleOpenActivate(e, row)}
                      >
                        <td
                          className="px-2 py-2 align-middle"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="border-border accent-brand-primary size-3.5 cursor-pointer rounded border"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleCheckbox(row.id, e.target.checked);
                              selectionAnchor.current = index;
                            }}
                            aria-label={`Select ${row.name}`}
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <div
                            className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-md px-1 py-0.5"
                            onDragOver={row.kind === "folder" ? (e) => onRowDragOverFolder(e, row.id) : undefined}
                            onDrop={row.kind === "folder" ? (e) => void onDropOnFolderRow(e, row.id) : undefined}
                          >
                            <FileIco
                              className={cn(
                                "size-5 shrink-0",
                                row.kind === "folder" ? "text-status-warning/90" : "text-brand-primary",
                              )}
                              aria-hidden
                            />
                            <span className="truncate font-medium">{row.name}</span>
                          </div>
                        </td>
                        <td className="text-muted-foreground px-4 py-2 align-middle whitespace-nowrap">
                          {new Date(row.updatedAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="text-muted-foreground px-4 py-2 align-middle whitespace-nowrap">
                          {formatBytes(row.sizeBytes)}
                        </td>
                        <td className="px-2 py-2 align-middle whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu.Root modal={false}>
                            <DropdownMenu.Trigger data-slot="button" asChild>
                              <button
                                type="button"
                                className={cn(
                                  "hover:bg-muted inline-flex cursor-pointer rounded-md border border-transparent p-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
                                  "aria-expanded:bg-muted data-[state=open]:bg-muted",
                                )}
                              >
                                <MoreHorizontal className="size-4" aria-hidden />
                                <span className="sr-only">Actions</span>
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                sideOffset={6}
                                align="end"
                                className="border-border bg-popover text-popover-foreground z-50 min-w-44 rounded-xl border py-1 p-1 shadow-lg"
                              >
                                {row.kind === "folder" ? (
                                  <DropdownMenu.Item
                                    className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body-sm outline-none"
                                    onSelect={() => goFolder(row.id)}
                                  >
                                    <Folder className="size-4 shrink-0" aria-hidden /> Open
                                  </DropdownMenu.Item>
                                ) : (
                                  row.ufsUrl && (
                                    <DropdownMenu.Item
                                      className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body-sm outline-none"
                                      onSelect={() => window.open(row.ufsUrl!, "_blank", "noopener,noreferrer")}
                                    >
                                      <FileText className="size-4 shrink-0" aria-hidden /> Open
                                    </DropdownMenu.Item>
                                  )
                                )}
                                <DropdownMenu.Item
                                  className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body-sm outline-none"
                                  onSelect={() => openRename(row)}
                                >
                                  <PencilLine className="size-4 shrink-0" aria-hidden /> Rename
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="bg-border my-1 h-px" />
                                <DropdownMenu.Item
                                  className="hover:bg-destructive/10 text-destructive focus:bg-destructive/10 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body-sm outline-none"
                                  onSelect={() => openDelete(row)}
                                >
                                  <Trash2 className="size-4 shrink-0" aria-hidden /> Delete
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 p-4">
                {rows.map((row, index) => {
                  const isSelected = selectedIds.has(row.id);
                  const rowDrop = row.kind === "folder" && dropTargetId === row.id;
                  return (
                    <div
                      key={row.id}
                      draggable
                      onDragStart={(e) => onDragRowStart(e, row)}
                      role="button"
                      tabIndex={0}
                      onMouseDown={(e) => handleRowMouseDown(e, row, index)}
                      onClick={(e) => handleOpenActivate(e, row)}
                      onKeyDown={(e) => handleOpenActivate(e, row)}
                      className={cn(
                        "border-border group relative cursor-pointer rounded-xl border bg-card p-2 text-left shadow-sm transition-colors",
                        isSelected && "bg-brand-primary/6 border-brand-primary/35",
                        rowDrop && "ring-brand-primary ring-2 ring-offset-2",
                      )}
                      onDragOver={row.kind === "folder" ? (e) => onRowDragOverFolder(e, row.id) : undefined}
                      onDrop={row.kind === "folder" ? (e) => void onDropOnFolderRow(e, row.id) : undefined}
                    >
                      <input
                        type="checkbox"
                        className="border-border accent-brand-primary absolute top-2 left-2 z-10 size-3.5 cursor-pointer rounded border bg-card/95"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          toggleCheckbox(row.id, e.target.checked);
                          selectionAnchor.current = index;
                        }}
                        aria-label={`Select ${row.name}`}
                      />
                      {row.kind === "folder" ? (
                        <div className="bg-muted relative flex aspect-photo-card w-full flex-col items-center justify-center rounded-lg border border-border/80">
                          <Folder className="text-status-warning mb-2 size-12 opacity-80" aria-hidden />
                        </div>
                      ) : (
                        <GridThumb ufsUrl={row.ufsUrl ?? ""} name={row.name} mimeType={row.mimeType} />
                      )}
                      <p className="mt-2 line-clamp-2 text-body-sm font-medium leading-snug">{row.name}</p>
                      <p className="text-muted-foreground mt-1 text-[11px]">{formatBytes(row.sizeBytes)}</p>
                      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu.Root modal={false}>
                          <DropdownMenu.Trigger data-slot="button" asChild>
                            <button
                              type="button"
                              className="hover:bg-muted border-border inline-flex cursor-pointer rounded-md border bg-card/95 p-1 text-muted-foreground outline-none hover:text-foreground"
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              sideOffset={6}
                              align="end"
                              className="border-border bg-popover text-popover-foreground z-50 min-w-44 rounded-xl border py-1 p-1 shadow-lg"
                            >
                              {row.kind === "folder" ? (
                                <DropdownMenu.Item
                                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body-sm outline-none"
                                  onSelect={() => goFolder(row.id)}
                                >
                                  <Folder className="size-4" aria-hidden /> Open
                                </DropdownMenu.Item>
                              ) : (
                                row.ufsUrl && (
                                  <DropdownMenu.Item
                                    className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body-sm outline-none"
                                    onSelect={() => window.open(row.ufsUrl!, "_blank", "noopener,noreferrer")}
                                  >
                                    <FileText className="size-4" aria-hidden /> Open
                                  </DropdownMenu.Item>
                                )
                              )}
                              <DropdownMenu.Item
                                className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body-sm outline-none"
                                onSelect={() => openRename(row)}
                              >
                                <PencilLine className="size-4" aria-hidden /> Rename
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="bg-border my-1 h-px" />
                              <DropdownMenu.Item
                                className="hover:bg-destructive/10 text-destructive flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-body-sm outline-none"
                                onSelect={() => openDelete(row)}
                              >
                                <Trash2 className="size-4" aria-hidden /> Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreateFolder();
            }}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" type="button" onClick={() => void onCreateFolder()} disabled={dialogBusy}>
              {dialogBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameConfirm();
            }}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" type="button" onClick={() => void onRenameConfirm()} disabled={dialogBusy}>
              {dialogBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{deleteRow?.kind === "folder" ? "Delete folder?" : "Delete file?"}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-body-sm leading-relaxed">
            {deleteRow?.kind === "folder"
              ? "Everything inside will be permanently removed from storage."
              : "This file will be removed from UploadThing permanently."}{" "}
            <strong className="text-foreground">{deleteRow?.name}</strong>
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" size="sm" type="button" onClick={() => void onDeleteConfirm()} disabled={dialogBusy}>
              {dialogBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} items?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-body-sm leading-relaxed">
            Selected files and folders will be permanently removed. Folders are deleted with all of their contents.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" size="sm" type="button" onClick={() => void onBatchDeleteConfirm()} disabled={dialogBusy}>
              {dialogBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Delete all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-body-sm">Choose a destination. Names adjust automatically if a duplicate exists.</p>
          <div className="bg-muted/40 max-h-64 overflow-y-auto rounded-lg border p-2">
            <button
              type="button"
              className={cn(
                "hover:bg-muted/80 mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-body-sm",
                moveTargetParentId === null && "bg-brand-primary/10 text-brand-primary font-medium",
              )}
              onClick={() => setMoveTargetParentId(null)}
            >
              <HardDrive className="size-4 shrink-0" aria-hidden />
              My Drive
            </button>
            <MovePickerNodes nodes={tree} depth={0} forbidden={forbiddenMove} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button size="sm" type="button" onClick={() => void onMoveDialogConfirm()} disabled={dialogBusy}>
              {dialogBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Move here"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}