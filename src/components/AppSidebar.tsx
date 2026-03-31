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
  ChevronsUpDown
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

export function AppSidebar({ currentBlueprintId, onSelectBlueprint, onNewBlueprint }: AppSidebarProps) {
  const { user } = useAuth();
  const [chats, setChats] = React.useState<Chat[]>([]);
  // Delete Dialog Status
  const [chatToDelete, setChatToDelete] = React.useState<Chat | null>(null);
  // Rename Dialog Status
  const [chatToRename, setChatToRename] = React.useState<Chat | null>(null);
  const [newName, setNewName] = React.useState("");

  React.useEffect(() => {
    if (!user) {
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
    if (!user || !chatToDelete) return;
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
    if (!user || !chatToRename || !newName.trim()) return;
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
        <SidebarHeader className="bg-card">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 bg-cover overflow-hidden">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="size-4 text-primary" />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none overflow-hidden">
                      <span className="font-semibold text-sm truncate">{user.displayName || user.email?.split("@")[0]}</span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border border-border bg-card shadow-2xl"
                  side="right"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={() => { auth.signOut(); }} className="hover:bg-destructive/10 text-destructive focus:text-destructive cursor-pointer group">
                    <LogOut className="mr-2 h-4 w-4 group-hover:text-destructive" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
    </>
  )
}
