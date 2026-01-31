"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Button, Typography, IconButton, Paper, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import type { Dashboard, DashboardCard } from "@/components/dashboards/server/dashboard.registry";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setEntities } from "@/store/slices/entities-slice";
import { useEntitySubscriptions } from "@/hooks/useEntitySubscriptions";
import EntityCard from "@/components/dashboards/client/cards/EntityCard";
import { WeatherCard } from "@/components/panels/weather/weather-card";
import { useGeolocation } from "@/hooks/use-geolocation";
import { apiClient } from "@/lib/api-client";

// Generic Card Wrapper
const GenericCard = ({ card }: { card: DashboardCard }) => {
    const { lat, lon } = useGeolocation();

    switch (card.type) {
        case "entity":
            return <EntityCard entityId={card.config.entityId} config={card.config} />;
        case "weather":
            return <WeatherCard lat={lat || undefined} lon={lon || undefined} />;
        default:
            return <Paper sx={{ p: 2 }}>Unknown Card Type: {card.type}</Paper>;
    }
};

// Sortable Wrapper
function SortableCard({ card, isEditing, onDelete }: { card: DashboardCard; isEditing: boolean; onDelete: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: card.id, disabled: !isEditing });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: `span ${card.width}`,
        // Ensure card is visible while dragging
        zIndex: transform ? 999 : "auto",
        position: 'relative' as 'relative',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {isEditing && (
                <IconButton
                    size="small"
                    onClick={(e) => {
                        // IMPORTANT: Prevent drag start or other events
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(card.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Stop DND from grabbing it
                    sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        zIndex: 1000,
                        bgcolor: 'background.paper',
                        boxShadow: 2,
                        '&:hover': { bgcolor: 'error.main', color: 'white' }
                    }}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            )}
            <GenericCard card={card} />
        </div>
    );
}

export default function DashboardRenderer({ dashboardId }: { dashboardId: string }) {
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [cards, setCards] = useState<DashboardCard[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);

    const dispatch = useAppDispatch();
    const entities = useAppSelector((state) => state.entities.entities);
    const { isConnected } = useEntitySubscriptions();
    const initialFetchAttempted = useRef(false);

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { // Require movement to drag to separate click vs drag
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchDashboard();
    }, [dashboardId]);

    // Fetch Entities (Copied from OverviewPanel)
    useEffect(() => {
        if (initialFetchAttempted.current) return;
        initialFetchAttempted.current = true;

        async function fetchEntities() {
            try {
                const data = await apiClient.get<any[]>("/entities");
                // Use a transition or check if component is mounted to avoid state updates on unmount
                if (entities.length === 0) {
                    dispatch(setEntities(data || []));
                }
            } catch (err) {
                console.error("Failed to load entities", err);
            }
        }
        fetchEntities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDashboard = async () => {
        try {
            const data = await apiClient.get<Dashboard>(`/dashboards/${dashboardId}`);
            setDashboard(data);
            setCards(data.cards);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setCards((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Persist order
                handleReorder(newItems);
                return newItems;
            });
        }
    };

    const handleReorder = async (newCards: DashboardCard[]) => {
        try {
            await apiClient.put(`/dashboards/${dashboardId}/reorder`, {
                cardIds: newCards.map(c => c.id)
            });
        } catch (err) {
            console.error("Failed to save order", err);
        }
    };

    const addNewCard = async (type: string, entityId?: string) => {
        try {
            await apiClient.post(`/dashboards/${dashboardId}/cards`, {
                type,
                config: type === 'entity' ? { entityId } : {}
            });
            fetchDashboard();
            setShowAddCard(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCard = async (cardId: string) => {
        if (!confirm("Delete this card?")) return;

        // Optimistic UI update
        setCards(prev => prev.filter(c => c.id !== cardId));

        try {
            await apiClient.delete(`/dashboards/${dashboardId}/cards/${cardId}`);
        } catch (err) {
            console.error("Failed to delete card", err);
            fetchDashboard(); // Revert on error
        }
    };

    if (!dashboard) return <Typography>Loading...</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                <Typography variant="h4">{dashboard.title}</Typography>
                <Box>
                    {isEditing && (
                        <Button
                            startIcon={<AddIcon />}
                            variant="contained"
                            onClick={() => setShowAddCard(true)}
                            sx={{ mr: 2 }}
                        >
                            Add Card
                        </Button>
                    )}
                    <IconButton onClick={() => setIsEditing(!isEditing)} color={isEditing ? "primary" : "default"}>
                        {isEditing ? <SaveIcon /> : <EditIcon />}
                    </IconButton>
                </Box>
            </Box>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={cards.map(c => c.id)}
                    strategy={rectSortingStrategy}
                >
                    <Box sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 2,
                        alignItems: "flex-start" // Prevent cards from stretching to row height
                    }}>
                        {cards.map((card) => (
                            <SortableCard
                                key={card.id}
                                card={card}
                                isEditing={isEditing}
                                onDelete={handleDeleteCard}
                            />
                        ))}
                    </Box>
                </SortableContext>
            </DndContext>

            {/* Add Card Dialog */}
            <Dialog open={showAddCard} onClose={() => setShowAddCard(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Card</DialogTitle>
                <DialogContent dividers>
                    <List>
                        <ListItem button onClick={() => addNewCard('weather')}>
                            <ListItemText primary="Weather Card" secondary="Shows current weather" />
                        </ListItem>
                        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>Entities</Typography>
                        {entities.length > 0 ? (
                            entities.map(entity => (
                                <ListItem button key={entity.entityId} onClick={() => addNewCard('entity', entity.entityId)}>
                                    <ListItemText primary={entity.name || entity.entityId} secondary={entity.domain} />
                                </ListItem>
                            ))
                        ) : (
                            <Typography variant="body2" color="text.secondary">No entities found. Connect devices first.</Typography>
                        )}
                    </List>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
