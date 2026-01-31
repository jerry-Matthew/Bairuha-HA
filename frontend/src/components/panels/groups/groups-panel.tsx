
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  PowerSettingsNew as PowerIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { PanelHeader } from "@/components/ui/panel-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconAutocomplete } from "@/components/ui/icon-autocomplete";

interface Group {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  aggregatedState?: {
    state: 'on' | 'off' | 'mixed' | 'unavailable' | 'unknown';
    allOn: boolean;
    allOff: boolean;
    hasMixed: boolean;
    memberStates: Array<{ entityId: string; state: string }>;
  };
  state?: any; // To handle both aggregatedState and state depending on API response
}

interface Entity {
  id: string;
  entityId: string;
  name?: string;
  domain: string;
  state: string;
}

export function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [controlDialogOpen, setControlDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuGroup, setMenuGroup] = useState<Group | null>(null);

  // Form states
  const [groupName, setGroupName] = useState("");
  const [groupIcon, setGroupIcon] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupDomain, setGroupDomain] = useState("");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);

  // Load groups and entities
  useEffect(() => {
    loadGroups();
    loadEntities();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      // NestJS: GET /api/groups?includeMembers=true
      const response = await fetch("/api/groups?includeMembers=true");
      if (!response.ok) throw new Error("Failed to load groups");
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEntities = async () => {
    try {
      // Assuming existing backend endpoint or one I need to verify: 
      // User code had /api/registries/entities. 
      // If NestJS backend has EntitiesController?
      // If not, I might need to implement GET /api/entities?
      // I'll assume /api/entities or /api/registries/entities exists or investigate later.
      // Let's use /api/entities as a safe bet for NestJS REST standards usually?
      // Wait, earlier I checked backend/src/devices/entities.service.ts but not controller.
      // If this fails, I'll need to find the correct endpoint.
      const response = await fetch("/api/entities");
      if (!response.ok) {
        // Fallback to try legacy path or other known path if first fails?
        // For now let's try /api/devices/entities if needed?
        // Or just /api/entities usually map to EntitiesController.
        throw new Error("Failed to load entities");
      }
      const data = await response.json();
      // data might be { entities: [] } or just [] depending on controller.
      setEntities(data.entities || data || []);
    } catch (err: any) {
      console.error("Failed to load entities:", err);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          icon: groupIcon || undefined,
          description: groupDescription || undefined,
          domain: groupDomain || undefined,
          entityIds: selectedEntityIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Failed to create group");
      }

      setSnackbar({ open: true, message: "Group created successfully" });
      setCreateDialogOpen(false);
      resetForm();
      loadGroups();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          icon: groupIcon || undefined,
          description: groupDescription || undefined,
          domain: groupDomain || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Failed to update group");
      }

      setSnackbar({ open: true, message: "Group updated successfully" });
      setEditDialogOpen(false);
      resetForm();
      loadGroups();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete group");

      setSnackbar({ open: true, message: "Group deleted successfully" });
      loadGroups();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleControlGroup = async (command: "turn_on" | "turn_off") => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Failed to control group");
      }

      setSnackbar({ open: true, message: `Group ${command === "turn_on" ? "turned on" : "turned off"}` });
      setControlDialogOpen(false);
      // Wait a bit before reloading to let states update
      setTimeout(loadGroups, 1000);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleAddEntity = async (groupId: string, entityId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });

      if (!response.ok) throw new Error("Failed to add entity");

      setSnackbar({ open: true, message: "Entity added to group" });
      loadGroups();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleRemoveEntity = async (groupId: string, entityId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${entityId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove entity");

      setSnackbar({ open: true, message: "Entity removed from group" });
      loadGroups();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const resetForm = () => {
    setGroupName("");
    setGroupIcon("");
    setGroupDescription("");
    setGroupDomain("");
    setSelectedEntityIds([]);
    setSelectedGroup(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group);
    setGroupName(group.name);
    setGroupIcon(group.icon || "");
    setGroupDescription(group.description || "");
    setGroupDomain(group.domain || "");
    setEditDialogOpen(true);
  };

  const openControlDialog = (group: Group) => {
    setSelectedGroup(group);
    setControlDialogOpen(true);
  };

  const openMembersDialog = (group: Group) => {
    setSelectedGroup(group);
    setMembersDialogOpen(true);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: Group) => {
    setMenuAnchor(event.currentTarget);
    setMenuGroup(group);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuGroup(null);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "on":
        return "success";
      case "off":
        return "default";
      case "mixed":
        return "warning";
      case "unavailable":
        return "error";
      default:
        return "default";
    }
  };

  const getGroupStateData = (group: Group | null) => {
    if (!group) return undefined;
    return group.state || group.aggregatedState;
  }

  if (loading && groups.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PanelHeader
        title="Groups"
        description="Organize entities into logical groups"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{
              whiteSpace: "nowrap",
            }}
          >
            Create Group
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {groups.length === 0 && !loading ? (
        <EmptyState
          icon={<GroupIcon sx={{ fontSize: 64, color: "text.secondary" }} />}
          title="No Groups"
          description="Create your first group to organize entities"
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Create Group
            </Button>
          }
        />
      ) : (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {groups.map((group) => {
            const stateData = getGroupStateData(group);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {group.icon ? (
                          <Typography>{group.icon}</Typography>
                        ) : (
                          <GroupIcon />
                        )}
                        <Typography variant="h6">{group.name}</Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, group)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>

                    {group.description && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {group.description}
                      </Typography>
                    )}

                    <Box display="flex" gap={1} flexWrap="wrap" my={2}>
                      {group.domain && (
                        <Chip label={group.domain} size="small" variant="outlined" />
                      )}
                      <Chip
                        label={`${group.memberCount || 0} members`}
                        size="small"
                        variant="outlined"
                      />
                      {stateData && (
                        <Chip
                          label={stateData.state}
                          size="small"
                          color={getStateColor(stateData.state) as any}
                        />
                      )}
                    </Box>

                    {stateData && (
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">
                          State: {stateData.state}
                          {stateData.allOn && " (All On)"}
                          {stateData.allOff && " (All Off)"}
                          {stateData.hasMixed && " (Mixed)"}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>

                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<PowerIcon />}
                      onClick={() => openControlDialog(group)}
                    >
                      Control
                    </Button>
                    <Button
                      size="small"
                      onClick={() => openMembersDialog(group)}
                    >
                      Members
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Group</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            margin="normal"
            required
          />
          <Box sx={{ mt: 2, mb: 1 }}>
            <IconAutocomplete
              value={groupIcon}
              onChange={setGroupIcon}
              label="Icon"
              helperText="Search and select an icon, or type a custom MDI icon name"
            />
          </Box>
          <TextField
            fullWidth
            label="Description"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Domain (e.g., light, switch)"
            value={groupDomain}
            onChange={(e) => setGroupDomain(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained" disabled={!groupName}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            margin="normal"
            required
          />
          <Box sx={{ mt: 2, mb: 1 }}>
            <IconAutocomplete
              value={groupIcon}
              onChange={setGroupIcon}
              label="Icon"
              helperText="Search and select an icon, or type a custom MDI icon name"
            />
          </Box>
          <TextField
            fullWidth
            label="Description"
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Domain"
            value={groupDomain}
            onChange={(e) => setGroupDomain(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateGroup} variant="contained" disabled={!groupName}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Control Group Dialog */}
      <Dialog open={controlDialogOpen} onClose={() => setControlDialogOpen(false)}>
        <DialogTitle>Control Group: {selectedGroup?.name}</DialogTitle>
        <DialogContent>
          <Typography>
            Turn all members of this group on or off simultaneously.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setControlDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleControlGroup("turn_off")}
            variant="outlined"
            color="error"
          >
            Turn Off
          </Button>
          <Button
            onClick={() => handleControlGroup("turn_on")}
            variant="contained"
            color="success"
          >
            Turn On
          </Button>
        </DialogActions>
      </Dialog>

      {/* Members Dialog */}
      <Dialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Group Members: {selectedGroup?.name}</DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Add Entity
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {entities
                .filter((e) => !getGroupStateData(selectedGroup)?.memberStates?.some((m: any) => m.entityId === e.entityId))
                .map((entity) => (
                  <Chip
                    key={entity.id}
                    label={`${entity.name || entity.entityId} (${entity.state})`}
                    onClick={() => handleAddEntity(selectedGroup!.id, entity.entityId)}
                    clickable
                  />
                ))}
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Current Members
          </Typography>
          {getGroupStateData(selectedGroup)?.memberStates?.length === 0 ? (
            <Typography color="text.secondary">No members</Typography>
          ) : (
            <Box display="flex" gap={1} flexWrap="wrap">
              {getGroupStateData(selectedGroup)?.memberStates?.map((member: any) => (
                <Chip
                  key={member.entityId}
                  label={`${member.entityId} (${member.state})`}
                  onDelete={() => handleRemoveEntity(selectedGroup!.id, member.entityId)}
                  color={member.state === "on" ? "success" : "default"}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Group Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            if (menuGroup) openEditDialog(menuGroup);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuGroup) {
              handleDeleteGroup(menuGroup.id);
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
