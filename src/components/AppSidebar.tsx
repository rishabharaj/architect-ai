"use client"

import * as React from "react"
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Edit2,
  MessageSquare,
  Cpu,
  LogOut,
  User as UserIcon,
  ChevronDown,
  PanelLeftClose,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { useAuth } from "@/hooks/useAuth"
import { db, auth } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { toast } from "sonner"

interface AppSidebarProps {
  currentBlueprintId: string | null;
  onSelectBlueprint: (id: string) => void;
  onNewBlueprint: () => void;
}

interface Chat {
  id: string;
  name: string;
  createdAt: string;
}

// Small close/back button for the sidebar
function SidebarCloseButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors w-full border-b border-border/50"
      aria-label="Close sidebar"
    >
      <PanelLeftClose className="w-4 h-4" />
      <span>Back</span>
    </button>
  );
}

export function AppSidebar({ currentBlueprintId, onSelectBlueprint, onNewBlueprint }: AppSidebarProps) {
  const { user } = useAuth();
  const [chats, setChats] = React.useState<Chat[]>([]);
  // Delete Dialog Status
  const [chatToDelete, setChatToDelete] = React.useState<Chat | null>(null);
  // Rename Dialog Status
  const [chatToRename, setChatToRename] = React.useState<Chat | null>(null);
  const [newName, setNewName] = React.useState("");
  // Sign Out Confirmation Status
  const [showSignOutConfirm, setShowSignOutConfirm] = React.useState(false);
  const [profileExpanded, setProfileExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!user || !db) {
      setChats([]);
      return;
    }
    const q = query(collection(db, "users", user.uid, "chats"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: Chat[] = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() } as Chat);
      });
      setChats(loaded);
    });
    return unsubscribe;
  }, [user]);

  const handleDelete = async () => {
    if (!user || !chatToDelete || !db) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "chats", chatToDelete.id));
      if (currentBlueprintId === chatToDelete.id) {
        onNewBlueprint();
      }
      toast.success("Chat deleted");
    } catch (err) {
      toast.error("Failed to delete chat");
    } finally {
      setChatToDelete(null);
    }
  };

  const handleRename = async () => {
    if (!user || !chatToRename || !newName.trim() || !db) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "chats", chatToRename.id), {
        name: newName.trim(),
      });
      toast.success("Chat renamed");
    } catch (err) {
      toast.error("Failed to rename chat");
    } finally {
      setChatToRename(null);
    }
  };

  if (!user) return null;

  return (
    <>
      <Sidebar variant="inset" className="border-r border-border dark">
        <SidebarHeader className="bg-card border-b border-border p-0">
          {/* Close / Back button row */}
          <SidebarCloseButton />
          {/* Compact profile row */}
          <button
            onClick={() => setProfileExpanded(!profileExpanded)}
            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 overflow-hidden shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="size-4 text-primary" />
              )}
            </div>
            <div className="flex flex-col gap-0.5 leading-none overflow-hidden text-left">
              <span className="font-semibold text-sm truncate text-foreground">{user.displayName || user.email?.split("@")[0]}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
            <ChevronDown className={`ml-auto size-4 text-muted-foreground transition-transform duration-200 shrink-0 ${profileExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Expanded profile panel */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${profileExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col items-center px-4 pb-4 pt-2 gap-3 border-t border-border/50">
              {/* Large avatar */}
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/10">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-7 h-7 text-primary" />
                )}
              </div>
              <div className="text-center overflow-hidden w-full">
                <p className="font-semibold text-sm text-foreground truncate">{user.displayName || user.email?.split("@")[0]}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full h-8 text-xs font-medium mt-1"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="bg-card">
          <SidebarGroup>
            <SidebarGroupContent>
              {chats.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <Cpu className="size-6 text-muted-foreground/30" />
                  No past architectures found.
                </div>
              ) : (
                <SidebarMenu>
                  {chats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        isActive={currentBlueprintId === chat.id}
                        onClick={() => onSelectBlueprint(chat.id)}
                        tooltip={chat.name}
                        className={currentBlueprintId === chat.id ? "bg-accent/20 text-accent font-medium border border-accent/30" : "text-muted-foreground"}
                      >
                        <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{chat.name}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction showOnHover className="bg-transparent hover:bg-secondary">
                            <MoreHorizontal className="text-muted-foreground" />
                            <span className="sr-only">More</span>
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" className="border-border bg-card shadow-2xl">
                          <DropdownMenuItem onClick={() => { setChatToRename(chat); setNewName(chat.name); }} className="hover:bg-secondary cursor-pointer">
                            <Edit2 className="mr-2 h-4 w-4" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setChatToDelete(chat)} className="hover:bg-destructive/10 text-destructive focus:text-destructive cursor-pointer">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="bg-card border-t border-border mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" onClick={onNewBlueprint} className="bg-primary/10 hover:bg-primary/20 hover:text-primary transition-colors text-primary border border-primary/20">
                <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sm">New Session</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Delete Dialog */}
      <Dialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <DialogContent className="border-border bg-card shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Session</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{chatToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setChatToDelete(null)} className="h-9">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="h-9 drop-shadow-md">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!chatToRename} onOpenChange={(open) => !open && setChatToRename(null)}>
        <DialogContent className="border-border bg-card shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Rename Session</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter a new name for this architecture space.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
              className="bg-background/50 border-border text-foreground"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setChatToRename(null)} className="h-9">Cancel</Button>
            <Button onClick={handleRename} className="h-9 bg-accent hover:bg-accent/90 text-accent-foreground drop-shadow-md">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out / Profile Dialog */}
      <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <DialogContent className="border-border bg-card shadow-xl sm:max-w-sm flex flex-col items-center p-6 text-center gap-0">
          <DialogHeader className="flex flex-col items-center justify-center w-full">
            {/* Profile Picture */}
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden mb-3 shadow-lg shadow-primary/10">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8 text-primary" />
              )}
            </div>
            {/* Name & Email */}
            <DialogTitle className="text-foreground text-lg font-bold">
              {user.displayName || user.email?.split("@")[0]}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              {user.email}
            </DialogDescription>
          </DialogHeader>

          {/* Divider */}
          <div className="w-full border-t border-border my-5" />

          {/* Actions */}
          <div className="flex flex-col gap-2.5 w-full">
            <Button
              variant="destructive"
              onClick={async () => {
                setShowSignOutConfirm(false);
                await auth?.signOut();
                toast.success("Signed out successfully");
              }}
              className="h-10 w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground drop-shadow-md font-medium"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSignOutConfirm(false)}
              className="h-10 w-full text-foreground border-border hover:bg-secondary"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
