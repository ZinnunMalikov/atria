from engine import Patient, Nurse, Doctor, get_path
from visualizer import HospitalVisualizer
import heapq
import random
import os
import time
import matplotlib.pyplot as plt
import json
import numpy as np
import requests
from tokenc import TokenClient


def create_simulation(
    hospital,
    nurse_positions,
    doctor_positions,
    treatment_rooms_config,
    spawn_point=(0, 0),
    waiting_room_pos=(0, 1),
    pattern=[2, 5, 3, 1, 5, 2, 3, 1, 5, 3],
):
    """
    Create a simulation context with the given configuration.

    Args:
        hospital: 2D array representing hospital layout
                  -2: Wall (impassable)
                  -1: Spawn point
                   0: Free space (walkable)
                   1: Waiting room
                  Treatment rooms are automatically marked based on treatment_rooms_config
        nurse_positions: List of (row, col) tuples for nurse idle positions
        doctor_positions: List of (row, col) tuples for doctor idle positions
        treatment_rooms_config: Dict mapping (row, col) to {'severity_type': 0 or 1, 'occupancy': 0}
                               severity_type 0 = low severity (will be marked as 4 in grid)
                               severity_type 1 = high severity (will be marked as 5 in grid)
        spawn_point: Tuple (row, col) where patients spawn
        waiting_room_pos: Tuple (row, col) for waiting room position
        pattern: List of patient severity values to cycle through

    Returns:
        Dictionary containing all simulation state and functions
    """
    # Create a copy of the hospital grid and mark treatment rooms
    hospital = [row[:] for row in hospital]  # Deep copy

    # Mark treatment rooms in the hospital grid based on config
    for pos, info in treatment_rooms_config.items():
        r, c = pos
        if info["severity_type"] == 0:
            hospital[r][c] = 4  # Low severity treatment room
        else:
            hospital[r][c] = 5  # High severity treatment room

    # Create nurses
    nurses = [Nurse(state=0, idle_position=pos) for pos in nurse_positions]

    # Create doctors
    doctors = [Doctor(state=0, idle_position=pos) for pos in doctor_positions]

    # Copy treatment rooms to avoid mutation
    treatment_rooms = {pos: info.copy() for pos, info in treatment_rooms_config.items()}

    # Simulation state
    sim_state = {
        "hospital": hospital,
        "nurses": nurses,
        "doctors": doctors,
        "treatment_rooms": treatment_rooms,
        "spawn_point": spawn_point,
        "waiting_room_pos": waiting_room_pos,
        "pattern": pattern,
        "pattern_index": 0,
        "waiting_room": [],
        "tick": 0,
        "active_tasks": [],
    }

    def spawn_patient():
        severity = sim_state["pattern"][sim_state["pattern_index"]]
        sim_state["pattern_index"] = (sim_state["pattern_index"] + 1) % len(sim_state["pattern"])
        patient = Patient(severity=severity, position=sim_state["spawn_point"])
        heapq.heappush(sim_state["waiting_room"], patient)
        print(f"Tick {sim_state['tick']}: Patient {patient.id} spawned with severity {severity}")

    def get_idle_nurse():
        for nurse in sim_state["nurses"]:
            if nurse.state == 0:
                return nurse
        return None

    def get_idle_doctor():
        idle_docs = [doc for doc in sim_state["doctors"] if doc.state == 0]
        if idle_docs:
            return random.choice(idle_docs)
        return None

    def get_free_room(severity):
        severity_type = 0 if severity < 4 else 1
        for room_pos, room_info in sim_state["treatment_rooms"].items():
            if room_info["severity_type"] == severity_type and room_info["occupancy"] == 0:
                return room_pos
        return None

    def patient_to_room():
        if not sim_state["waiting_room"]:
            return

        nurse = get_idle_nurse()
        if not nurse:
            return

        patient = heapq.heappop(sim_state["waiting_room"])
        room_pos = get_free_room(patient.severity)

        if not room_pos:
            heapq.heappush(sim_state["waiting_room"], patient)
            return

        sim_state["treatment_rooms"][room_pos]["occupancy"] = 1
        nurse.state = 1

        task = {
            "type": "escort_patient",
            "nurse": nurse,
            "patient": patient,
            "room": room_pos,
            "stage": "to_waiting_room",
            "path": get_path(sim_state["hospital"], nurse.position, sim_state["waiting_room_pos"]),
            "path_index": 0,
            "treatment_time": 5,
        }
        sim_state["active_tasks"].append(task)
        print(f"Tick {sim_state['tick']}: Nurse {nurse.id} assigned to Patient {patient.id} for room {room_pos}")

    def move_along_path(entity, task):
        """
        Move entity along path.

        Returns:
            True if reached destination, False otherwise
        """
        # If path is empty, we're already at destination
        if not task["path"]:
            return True

        if task["path_index"] < len(task["path"]):
            entity.position = task["path"][task["path_index"]]
            task["path_index"] += 1
            return False
        return True

    def process_tasks():
        completed_tasks = []

        for task in sim_state["active_tasks"]:
            if task["type"] == "escort_patient":
                if task["stage"] == "to_waiting_room":
                    if move_along_path(task["nurse"], task):
                        task["stage"] = "escort_to_room"
                        task["path"] = get_path(sim_state["hospital"], sim_state["waiting_room_pos"], task["room"])
                        task["path_index"] = 0
                        task["patient"].position = sim_state["waiting_room_pos"]

                elif task["stage"] == "escort_to_room":
                    if move_along_path(task["nurse"], task):
                        task["patient"].position = task["room"]
                        print(f"Tick {sim_state['tick']}: Patient {task['patient'].id} arrived at room {task['room']}")

                        if task["patient"].severity >= 4:
                            task["stage"] = "nurse_return"
                            task["path"] = get_path(
                                sim_state["hospital"], task["nurse"].position, task["nurse"].idle_position
                            )
                            task["path_index"] = 0
                        else:
                            task["stage"] = "treating"
                            task["treatment_counter"] = 0
                    else:
                        task["patient"].position = task["nurse"].position

                elif task["stage"] == "nurse_return":
                    if move_along_path(task["nurse"], task):
                        task["nurse"].state = 0
                        print(f"Tick {sim_state['tick']}: Nurse {task['nurse'].id} returned to idle position")

                        doctor = get_idle_doctor()
                        if doctor:
                            doctor.state = 1
                            doctor_task = {
                                "type": "doctor_treat",
                                "doctor": doctor,
                                "patient": task["patient"],
                                "room": task["room"],
                                "stage": "to_room",
                                "path": get_path(sim_state["hospital"], doctor.position, task["room"]),
                                "path_index": 0,
                                "treatment_time": task["treatment_time"],
                                "treatment_counter": 0,
                            }
                            sim_state["active_tasks"].append(doctor_task)
                            print(f"Tick {sim_state['tick']}: Doctor {doctor.id} assigned to Patient {task['patient'].id}")
                        else:
                            waiting_doctor_task = {
                                "type": "waiting_for_doctor",
                                "patient": task["patient"],
                                "room": task["room"],
                                "treatment_time": task["treatment_time"],
                            }
                            sim_state["active_tasks"].append(waiting_doctor_task)
                            print(f"Tick {sim_state['tick']}: Patient {task['patient'].id} waiting for doctor")

                        completed_tasks.append(task)

                elif task["stage"] == "treating":
                    task["treatment_counter"] += 1
                    if task["treatment_counter"] >= task["treatment_time"]:
                        task["nurse"].state = 0
                        task["stage"] = "patient_discharge"
                        # Ensure patient is at the treatment room before creating discharge path
                        task["patient"].position = task["room"]
                        discharge_path = get_path(sim_state["hospital"], task["room"], sim_state["spawn_point"])
                        if not discharge_path:
                            print(f"WARNING: No path found from {task['room']} to {sim_state['spawn_point']}")
                            discharge_path = [sim_state["spawn_point"]]  # Fallback
                        task["path"] = discharge_path
                        task["path_index"] = 0
                        sim_state["treatment_rooms"][task["room"]]["occupancy"] = 0
                        print(
                            f"Tick {sim_state['tick']}: Patient {task['patient'].id} treatment complete, discharging (path length: {len(discharge_path)})"
                        )

                elif task["stage"] == "patient_discharge":
                    if move_along_path(task["patient"], task):
                        Patient.count -= 1
                        print(f"Tick {sim_state['tick']}: Patient {task['patient'].id} discharged")
                        completed_tasks.append(task)

            elif task["type"] == "waiting_for_doctor":
                doctor = get_idle_doctor()
                if doctor:
                    doctor.state = 1
                    doctor_task = {
                        "type": "doctor_treat",
                        "doctor": doctor,
                        "patient": task["patient"],
                        "room": task["room"],
                        "stage": "to_room",
                        "path": get_path(sim_state["hospital"], doctor.position, task["room"]),
                        "path_index": 0,
                        "treatment_time": task["treatment_time"],
                        "treatment_counter": 0,
                    }
                    sim_state["active_tasks"].append(doctor_task)
                    print(f"Tick {sim_state['tick']}: Doctor {doctor.id} now available for Patient {task['patient'].id}")
                    completed_tasks.append(task)

            elif task["type"] == "doctor_treat":
                if task["stage"] == "to_room":
                    if move_along_path(task["doctor"], task):
                        task["stage"] = "treating"
                        print(f"Tick {sim_state['tick']}: Doctor {task['doctor'].id} treating Patient {task['patient'].id}")

                elif task["stage"] == "treating":
                    task["treatment_counter"] += 1
                    if task["treatment_counter"] >= task["treatment_time"]:
                        task["stage"] = "doctor_return"
                        task["path"] = get_path(
                            sim_state["hospital"], task["doctor"].position, task["doctor"].idle_position
                        )
                        task["path_index"] = 0
                        sim_state["treatment_rooms"][task["room"]]["occupancy"] = 0
                        print(f"Tick {sim_state['tick']}: Patient {task['patient'].id} treatment complete, doctor returning")

                elif task["stage"] == "doctor_return":
                    if move_along_path(task["doctor"], task):
                        task["doctor"].state = 0
                        print(f"Tick {sim_state['tick']}: Doctor {task['doctor'].id} returned to idle position")
                        task["stage"] = "patient_discharge"
                        # Ensure patient is at the treatment room before creating discharge path
                        task["patient"].position = task["room"]
                        discharge_path = get_path(sim_state["hospital"], task["room"], sim_state["spawn_point"])
                        if not discharge_path:
                            print(f"WARNING: No path found from {task['room']} to {sim_state['spawn_point']}")
                            discharge_path = [sim_state["spawn_point"]]  # Fallback
                        task["path"] = discharge_path
                        task["path_index"] = 0
                        print(
                            f"Tick {sim_state['tick']}: Patient {task['patient'].id} starting discharge (path length: {len(discharge_path)})"
                        )

                elif task["stage"] == "patient_discharge":
                    if move_along_path(task["patient"], task):
                        Patient.count -= 1
                        print(f"Tick {sim_state['tick']}: Patient {task['patient'].id} discharged")
                        completed_tasks.append(task)

        for task in completed_tasks:
            if task in sim_state["active_tasks"]:
                sim_state["active_tasks"].remove(task)

    # Add functions to sim_state
    sim_state["spawn_patient"] = spawn_patient
    sim_state["patient_to_room"] = patient_to_room
    sim_state["process_tasks"] = process_tasks

    return sim_state


def run_sim(sim_state, max_ticks=100):
    """Run simulation without visualization"""
    for tick in range(max_ticks):
        sim_state["tick"] = tick
        print(f"\n=== Tick {tick} ===")

        if tick % 5 == 0:
            sim_state["spawn_patient"]()

        sim_state["patient_to_room"]()
        sim_state["process_tasks"]()

        print(
            f"Active patients: {Patient.count}, Waiting: {len(sim_state['waiting_room'])}, Active tasks: {len(sim_state['active_tasks'])}"
        )


def run_visual(sim_state, max_ticks=100, interval=100):
    """
    Run simulation with graphical visualization with smooth movement.

    Returns:
        avg_congestion: 2D numpy array with average entities per occupied tick for each grid square
    """
    viz = HospitalVisualizer(sim_state["hospital"], sim_state["nurses"], sim_state["doctors"], sim_state["treatment_rooms"])

    rows = len(sim_state["hospital"])
    cols = len(sim_state["hospital"][0])
    congestion_sum = np.zeros((rows, cols))
    congestion_count = np.zeros((rows, cols))

    def capture_positions():
        """Capture current positions of all entities"""
        positions = {}
        for nurse in sim_state["nurses"]:
            positions[f"nurse_{nurse.id}"] = nurse.position
        for doctor in sim_state["doctors"]:
            positions[f"doctor_{doctor.id}"] = doctor.position
        for task in sim_state["active_tasks"]:
            if "patient" in task:
                positions[f"patient_{task['patient'].id}"] = task["patient"].position
        return positions

    def detect_swaps(prev_positions, curr_positions):
        """Detect when two entities are swapping positions between adjacent squares"""
        swaps = []
        checked_pairs = set()

        for entity_id1, curr_pos1 in curr_positions.items():
            prev_pos1 = prev_positions.get(entity_id1)
            if prev_pos1 is None or prev_pos1 == curr_pos1:
                continue

            # Check if positions are adjacent (manhattan distance = 1)
            if abs(prev_pos1[0] - curr_pos1[0]) + abs(prev_pos1[1] - curr_pos1[1]) != 1:
                continue

            # Check if another entity is moving from curr_pos1 to prev_pos1
            for entity_id2, curr_pos2 in curr_positions.items():
                if entity_id1 == entity_id2:
                    continue

                pair_key = tuple(sorted([entity_id1, entity_id2]))
                if pair_key in checked_pairs:
                    continue

                prev_pos2 = prev_positions.get(entity_id2)
                if prev_pos2 is None:
                    continue

                # Check if entities are swapping: entity1 goes from A to B, entity2 goes from B to A
                if prev_pos1 == curr_pos2 and prev_pos2 == curr_pos1:
                    type1, id1 = entity_id1.split("_")
                    type2, id2 = entity_id2.split("_")
                    swaps.append((prev_pos1, curr_pos1, type1, int(id1), type2, int(id2)))
                    checked_pairs.add(pair_key)
                    break

        return swaps

    def simulation_generator():
        for tick in range(max_ticks):
            sim_state["tick"] = tick

            prev_positions = capture_positions()

            # Run simulation logic
            if tick % 5 == 0:
                sim_state["spawn_patient"]()

            sim_state["patient_to_room"]()
            sim_state["process_tasks"]()

            curr_positions = capture_positions()

            # Track congestion for this tick - only count entities if there's movement
            tick_congestion = np.zeros((rows, cols))
            has_movement = np.zeros((rows, cols), dtype=bool)

            # First pass: identify squares with moving entities
            for entity_id, pos in curr_positions.items():
                prev_pos = prev_positions.get(entity_id)
                if prev_pos is not None and prev_pos != pos:
                    r, c = pos
                    has_movement[r, c] = True

            # Second pass: count entities only in squares with movement
            for entity_id, pos in curr_positions.items():
                r, c = pos
                if has_movement[r, c]:
                    tick_congestion[r, c] += 1

            congestion_sum[:] += tick_congestion
            congestion_count[:] += (tick_congestion > 0).astype(int)

            swaps = detect_swaps(prev_positions, curr_positions)

            stats = {
                "active_patients": Patient.count,
                "waiting": len(sim_state["waiting_room"]),
                "nurses_busy": sum(1 for n in sim_state["nurses"] if n.state == 1),
                "nurses_total": len(sim_state["nurses"]),
                "doctors_busy": sum(1 for d in sim_state["doctors"] if d.state == 1),
                "doctors_total": len(sim_state["doctors"]),
            }

            # Yield multiple frames for smooth interpolation
            for frame in range(viz.num_interp_frames):
                t = frame / viz.num_interp_frames
                yield {
                    "tick": tick,
                    "active_tasks": sim_state["active_tasks"],
                    "stats": stats,
                    "prev_positions": prev_positions,
                    "curr_positions": curr_positions,
                    "interp_t": t,
                    "swaps": swaps,
                }

    from matplotlib.animation import FuncAnimation

    _anim = FuncAnimation(
        viz.fig,
        viz.update,
        frames=simulation_generator(),
        interval=interval,
        blit=False,
        repeat=False,
    )

    viz.show()

    # Calculate average congestion (your original correct logic)
    avg_congestion = np.full((rows, cols), 0.0)
    for r in range(rows):
        for c in range(cols):
            if congestion_count[r, c] > 0:
                avg_congestion[r, c] = congestion_sum[r, c] / congestion_count[r, c]

    avg_congestion[0, 0] = 0.0
    avg_congestion[0, 1] = 0.0

    # Zero all treatment room positions
    for (r, c) in sim_state["treatment_rooms"].keys():
        avg_congestion[r, c] = 0.0

    save_congestion_to_csv(avg_congestion)
    display_congestion_analysis(sim_state, congestion_sum, congestion_count, max_ticks)

    # ✅ Wood Wide AI anomaly detection integrated here
    anomaly_results = analyze_congestion_with_woodwide(avg_congestion)

    # Generate and print Gemini improvement prompt (does NOT send to Gemini)
    generate_gemini_improvement_prompt(sim_state, avg_congestion, anomaly_results)

    return avg_congestion


def save_congestion_to_csv(avg_congestion):
    """Save the congestion 2D array to a CSV file in the data folder"""
    from datetime import datetime

    data_folder = os.path.join(os.path.dirname(__file__), "..", "..", "data")
    os.makedirs(data_folder, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"congestion_{timestamp}.csv"
    filepath = os.path.join(data_folder, filename)

    np.savetxt(filepath, avg_congestion, delimiter=",", fmt="%.4f")
    print(f"\nCongestion data saved to: {filepath}")


def display_congestion_analysis(sim_state, congestion_sum, congestion_count, total_ticks):
    """
    Display post-simulation congestion analysis (and PRINT the exact text payload
    we would send to Gemini asking for improvements). Does NOT send anything.
    """
    import json
    import matplotlib.patches as patches

    hospital = sim_state["hospital"]
    rows = len(hospital)
    cols = len(hospital[0])

    # ---- compute avg congestion ----
    avg_congestion = np.zeros((rows, cols), dtype=float)
    for r in range(rows):
        for c in range(cols):
            if congestion_count[r, c] > 0:
                avg_congestion[r, c] = congestion_sum[r, c] / congestion_count[r, c]
            else:
                avg_congestion[r, c] = 0.0

    # mask out any special squares you don't want to consider congestion
    avg_congestion[0, 0] = 0.0
    avg_congestion[0, 1] = 0.0
    for (r, c) in sim_state["treatment_rooms"].keys():
        avg_congestion[r, c] = 0.0

    # ---- visualize (your existing plot) ----
    fig, ax = plt.subplots(figsize=(10, 8))
    fig.suptitle("Post-Simulation Congestion Analysis (All Squares)", fontsize=14, fontweight="bold")

    for r in range(rows):
        for c in range(cols):
            cell_value = hospital[r][c]
            pos = (r, c)

            if cell_value == -2:
                color = "#2C3E50"; alpha = 0.3
            elif pos == (0, 0):
                color = "#95A5A6"; alpha = 0.3
            elif pos == (0, 1):
                color = "#F39C12"; alpha = 0.3
            elif pos in sim_state["treatment_rooms"]:
                if sim_state["treatment_rooms"][pos]["severity_type"] == 0:
                    color = "#3498DB"
                else:
                    color = "#E74C3C"
                alpha = 0.3
            else:
                color = "#ECF0F1"; alpha = 0.1

            rect = patches.Rectangle(
                (c - 0.5, r - 0.5), 1, 1,
                linewidth=1, edgecolor="gray",
                facecolor=color, alpha=alpha
            )
            ax.add_patch(rect)

    vmax = np.max(avg_congestion) if np.max(avg_congestion) > 0 else 1.0
    im = ax.imshow(avg_congestion, cmap="YlOrRd", interpolation="nearest", vmin=0, vmax=vmax, alpha=0.8)

    cbar = plt.colorbar(im, ax=ax)
    cbar.set_label("Average Entities per Tick", rotation=270, labelpad=20)

    max_congestion = np.max(avg_congestion)
    for r in range(rows):
        for c in range(cols):
            val = avg_congestion[r, c]
            ax.text(
                c, r, f"{val:.2f}",
                ha="center", va="center",
                fontsize=10, fontweight="bold",
                color="white" if val > max_congestion / 2 else "black",
            )

    ax.set_xlim(-0.5, cols - 0.5)
    ax.set_ylim(-0.5, rows - 0.5)
    ax.set_aspect("equal")
    ax.invert_yaxis()
    ax.set_xticks(range(cols))
    ax.set_yticks(range(rows))
    ax.grid(True, alpha=0.3, linewidth=1.5)
    ax.set_xlabel("Column")
    ax.set_ylabel("Row")

    # stats_text = (
    #     f"Grid Statistics:\n"
    #     f"Max: {np.max(avg_congestion):.2f}\n"
    #     f"Mean: {np.mean(avg_congestion):.2f}\n"
    #     f"Median: {np.median(avg_congestion):.2f}\n"
    # )
    # ax.text(
    #     1.02, 0.5, stats_text, transform=ax.transAxes,
    #     fontsize=10, verticalalignment="center",
    #     bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.5),
    # )

    plt.tight_layout()
    plt.show()

    # =========================
    # BUILD GEMINI TEXT PAYLOAD (PRINT ONLY, DO NOT SEND)
    # =========================

    # --- derive key locations from sim_state (edit these if your sim uses different keys) ---
    spawn_points = []
    waiting_areas = []

    # common patterns: explicit lists in sim_state OR encoded in hospital grid
    if "spawn_points" in sim_state:
        spawn_points = list(sim_state["spawn_points"])
    else:
        # fallback guess: (0,1) looks like your entry in the viz
        spawn_points = [(0, 1)]

    if "waiting_areas" in sim_state:
        waiting_areas = list(sim_state["waiting_areas"])
    else:
        # fallback guess: any cell with value 1 is a waiting square
        for rr in range(rows):
            for cc in range(cols):
                if hospital[rr][cc] == 1:
                    waiting_areas.append((rr, cc))

    nurse_positions = list(sim_state.get("nurse_positions", []))
    doctor_positions = list(sim_state.get("doctor_positions", []))

    treatment_rooms = []
    for (rr, cc), meta in sim_state.get("treatment_rooms", {}).items():
        treatment_rooms.append({
            "row": int(rr), "col": int(cc),
            "severity_type": int(meta.get("severity_type", -1)),
            "occupancy": float(meta.get("occupancy", 0.0)),
        })

    # --- run WoodWide analysis (or skip if key missing); assume you already have analyze_congestion_with_woodwide() ---
    ww_results = analyze_congestion_with_woodwide(avg_congestion)

    congested_points = []
    heavy_points = []

    # use your display_anomaly_results() to get structured output
    if ww_results:
        ww_out = display_anomaly_results(
            ww_results,
            [{"row": r, "col": c, "congestion": float(avg_congestion[r, c])} for r in range(rows) for c in range(cols)],
            grid_shape=avg_congestion.shape,
            only_congested=True,
            top_n=10,
            show_grid=False,
        )
        if ww_out:
            congested_points = ww_out.get("congested_points", [])

    # fallback: if none congested, take heaviest congestion cells
    if not congested_points:
        flat = []
        for rr in range(rows):
            for cc in range(cols):
                flat.append({"row": rr, "col": cc, "congestion": float(avg_congestion[rr, cc])})
        flat.sort(key=lambda x: x["congestion"], reverse=True)
        heavy_points = [p for p in flat if p["congestion"] > 0][:10]  # top 10 non-zero
    else:
        heavy_points = []  # not needed if we have anomalies

    # --- assemble the exact "text" to send to Gemini ---
    payload = {
        "task": "You are helping improve an ER congestion simulation. Use the setup context + congestion findings to suggest improvements.",
        "setup_context": {
            "grid_shape": [rows, cols],
            "hospital_grid_encoding": [list(map(int, row)) for row in hospital],
            "legend_guess": {
                "-2": "blocked/wall",
                "0": "walkable",
                "1": "waiting (if used)",
                "(0,0)": "special square (masked)",
                "(0,1)": "spawn/entrance (masked in congestion)",
            },
            "spawn_points": [{"row": int(r), "col": int(c)} for (r, c) in spawn_points],
            "waiting_areas": [{"row": int(r), "col": int(c)} for (r, c) in waiting_areas],
            "nurse_positions": [{"row": int(r), "col": int(c)} for (r, c) in nurse_positions],
            "doctor_positions": [{"row": int(r), "col": int(c)} for (r, c) in doctor_positions],
            "treatment_rooms": treatment_rooms,
            "notes": [
                "avg_congestion[r,c] = average entities per tick on that cell over the simulation",
                "some cells were forced to 0.0 congestion (spawn squares and treatment rooms) to avoid skew",
            ],
        },
        "congestion_summary": {
            "total_ticks": int(total_ticks),
            "avg_congestion_stats": {
                "max": float(np.max(avg_congestion)),
                "mean": float(np.mean(avg_congestion)),
                "median": float(np.median(avg_congestion)),
            },
            "woodwide_used": bool(ww_results),
            "findings": {
                "congested_points": congested_points,  # if any
                "fallback_heaviest_points": heavy_points,  # used only if no congested points
                "interpretation_rule": "If congested_points is empty, treat fallback_heaviest_points as likely bottlenecks to optimize.",
            },
        },
        "request": {
            "what_to_do": [
                "Diagnose likely bottlenecks and their causes using the layout + key locations.",
                "Suggest concrete operational changes (routing rules, staffing, room assignment, queue discipline).",
                "Suggest simulation changes/experiments to validate improvements (metrics to track, parameter sweeps).",
            ],
            "output_format": [
                "Bottleneck diagnosis",
                "Top recommended interventions (ranked)",
                "Next experiments to run (with expected outcomes)",
            ],
        },
    }

    gemini_text = (
        "ER CONGESTION SIMULATION IMPROVEMENT REQUEST\n"
        "Return practical, testable suggestions.\n\n"
        + json.dumps(payload, indent=2)
    )

    print("\n" + "=" * 60)
    print("TEXT PAYLOAD TO SEND TO GEMINI (NOT SENT YET)")
    print("=" * 60)
    print(gemini_text)
    print("=" * 60)


# =========================
# Wood Wide AI integration
# =========================

def analyze_congestion_with_woodwide(avg_congestion, api_key=None, model_id=None, base_url=None):
    """
    Inference-only anomaly detection via Wood Wide AI.

    ✅ Never trains a model.
    ✅ Uploads ONLY an inference dataset, then calls infer on an existing model_id.
    ✅ If model_id is missing, falls back to local anomaly detection.

    Env vars supported:
      - WOODWIDE_API_KEY   (preferred)
      - WOODWIDE           (back-compat if you already used this)
      - WOODWIDE_MODEL_ID  (required for inference-only)
      - WOODWIDE_BASE_URL  (optional)
    """
    import csv
    import os
    import tempfile
    import time
    import requests

    if api_key is None:
        api_key = os.environ.get("WOODWIDE")

    if model_id is None:
        model_id = os.environ.get("WOODWIDE_MODEL_ID")

    if base_url is None:
        base_url = os.environ.get("WOODWIDE_BASE_URL", "https://beta.woodwide.ai")

    # --- gather valid points ---
    rows, cols = avg_congestion.shape
    valid_points = []
    for r in range(rows):
        for c in range(cols):
            if avg_congestion[r, c] >= 0:
                valid_points.append({"row": r, "col": c, "congestion": float(avg_congestion[r, c])})

    if not valid_points:
        print("⚠️ No valid congestion data points to analyze.")
        return None

    # If missing creds/model, do NOT attempt training. Just fall back.
    if not api_key or not model_id:
        print("\n" + "=" * 60)
        print("🌲 WOOD WIDE AI (INFERENCE ONLY)")
        print("=" * 60)
        if not api_key:
            print("⚠️ Missing API key. Set WOODWIDE_API_KEY (or WOODWIDE).")
        if not model_id:
            print("⚠️ Missing model id. Set WOODWIDE_MODEL_ID to use inference-only mode.")
        print("➡️ Falling back to local anomaly detection (no training performed).")
        print("=" * 60)
        return run_local_anomaly_detection(valid_points)

    print("\n" + "=" * 60)
    print("🌲 WOOD WIDE AI (INFERENCE ONLY — NO TRAINING)")
    print("=" * 60)
    print(f"📊 Found {len(valid_points)} data points for inference")
    print(f"🤖 Using existing model_id: {model_id}")
    print(f"🌐 Base URL: {base_url}")

    # --- write inference CSV (only test/infer dataset) ---
    infer_csv = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="")
    infer_csv_path = infer_csv.name

    try:
        writer = csv.writer(infer_csv)
        writer.writerow(["row", "col", "congestion"])
        for point in valid_points:
            writer.writerow([point["row"], point["col"], f"{point['congestion']:.4f}"])
        infer_csv.close()

        headers = {"accept": "application/json", "Authorization": f"Bearer {api_key}"}

        timestamp = int(time.time())
        infer_dataset_name = f"hospital_congestion_infer_{timestamp}"

        print(f"\n[1/2] 📤 Uploading inference dataset to Wood Wide AI...")
        with open(infer_csv_path, "rb") as f:
            files = {"file": ("congestion_infer.csv", f, "text/csv")}
            data = {"name": infer_dataset_name, "overwrite": "true"}
            response = requests.post(f"{base_url}/api/datasets", headers=headers, files=files, data=data)

        if response.status_code != 200:
            print(f"❌ Error uploading inference dataset: {response.status_code}")
            print(response.text)
            print("➡️ Falling back to local anomaly detection (no training performed).")
            return run_local_anomaly_detection(valid_points)

        infer_dataset_id = response.json().get("id")
        print(f"✅ Inference dataset uploaded. ID: {infer_dataset_id}")

        print(f"\n[2/2] 🔍 Running inference...")
        response = requests.post(
            f"{base_url}/api/models/prediction/{model_id}/infer",
            headers=headers,
            params={"dataset_id": infer_dataset_id},
        )

        if response.status_code != 200:
            print(f"❌ Error running inference: {response.status_code}")
            print(response.text)
            print("➡️ Falling back to local anomaly detection (no training performed).")
            return run_local_anomaly_detection(valid_points)

        results = response.json()

        print("\n" + "-" * 60)
        print("📈 ANOMALY DETECTION RESULTS (Wood Wide AI — inference only)")
        print("-" * 60)

        display_anomaly_results(results, valid_points)
        print("=" * 60)

        return results

    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        print("➡️ Falling back to local anomaly detection (no training performed).")
        return run_local_anomaly_detection(valid_points)

    except Exception as e:
        print(f"❌ Error during inference-only anomaly detection: {e}")
        import traceback
        traceback.print_exc()
        print("➡️ Falling back to local anomaly detection (no training performed).")
        return run_local_anomaly_detection(valid_points)

    finally:
        try:
            if os.path.exists(infer_csv_path):
                os.remove(infer_csv_path)
        except Exception:
            pass


def run_local_anomaly_detection(valid_points):
    """Local statistical anomaly detection (IQR) fallback."""
    print("\n" + "-" * 60)
    print("📈 LOCAL ANOMALY DETECTION RESULTS")
    print("-" * 60)

    congestion_values = [p["congestion"] for p in valid_points]

    mean_val = float(np.mean(congestion_values))
    std_val = float(np.std(congestion_values))
    median_val = float(np.median(congestion_values))
    min_val = float(np.min(congestion_values))
    max_val = float(np.max(congestion_values))

    print(f"\n📊 Congestion Statistics:")
    print(f" Points analyzed: {len(valid_points)}")
    print(f" Mean: {mean_val:.4f}")
    print(f" Median: {median_val:.4f}")
    print(f" Std Dev: {std_val:.4f}")
    print(f" Min: {min_val:.4f}")
    print(f" Max: {max_val:.4f}")

    q1 = np.percentile(congestion_values, 25)
    q3 = np.percentile(congestion_values, 75)
    iqr = q3 - q1

    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    high_anomalies = []
    low_anomalies = []
    dead_zones = []
    normal_points = []

    for point in valid_points:
        congestion = point["congestion"]
        if congestion > upper_bound:
            high_anomalies.append(point)
        elif congestion < lower_bound and congestion > 0.001:
            low_anomalies.append(point)
        elif congestion < 0.001:
            dead_zones.append(point)
        else:
            normal_points.append(point)

    print(f"\n🔍 Anomaly Detection (IQR Method):")
    print(f" Lower bound: {lower_bound:.4f}")
    print(f" Upper bound: {upper_bound:.4f}")

    if high_anomalies:
        print(f"\n🔴 HIGH CONGESTION ANOMALIES ({len(high_anomalies)} found):")
        high_anomalies_sorted = sorted(high_anomalies, key=lambda x: x["congestion"], reverse=True)
        for point in high_anomalies_sorted[:10]:
            print(f" → Grid ({point['row']}, {point['col']}): congestion = {point['congestion']:.4f}")
        if len(high_anomalies) > 10:
            print(f" ... and {len(high_anomalies) - 10} more")
    else:
        print(f"\n✅ No high congestion anomalies detected")

    if dead_zones:
        print(f"\n🟡 DEAD ZONES ({len(dead_zones)} found):")
        for point in dead_zones[:10]:
            print(f" → Grid ({point['row']}, {point['col']}): congestion = {point['congestion']:.4f}")
        if len(dead_zones) > 10:
            print(f" ... and {len(dead_zones) - 10} more")
    else:
        print(f"\n✅ No dead zones detected")

    if low_anomalies:
        print(f"\n🟠 LOW CONGESTION ANOMALIES ({len(low_anomalies)} found):")
        for point in low_anomalies[:10]:
            print(f" → Grid ({point['row']}, {point['col']}): congestion = {point['congestion']:.4f}")
        if len(low_anomalies) > 10:
            print(f" ... and {len(low_anomalies) - 10} more")

    print(f"\n📋 Summary:")
    print(f" Normal points: {len(normal_points)}")
    print(f" High congestion (bottlenecks): {len(high_anomalies)}")
    print(f" Dead zones (unused): {len(dead_zones)}")
    print(f" Low traffic anomalies: {len(low_anomalies)}")
    print("=" * 60)

    return {
        "method": "local_iqr",
        "statistics": {"mean": mean_val, "std": std_val, "median": median_val, "q1": float(q1), "q3": float(q3), "iqr": float(iqr)},
        "anomalies": {"high_congestion": high_anomalies, "dead_zones": dead_zones, "low_traffic": low_anomalies},
        "normal": normal_points,
    }


def generate_gemini_improvement_prompt(sim_state, avg_congestion, anomaly_results):
    """
    Generate a text prompt for Gemini to suggest hospital setup improvements.
    Describes the hospital layout, spawn/waiting rooms, treatment rooms, and congestion anomalies.

    Returns the prompt string (does NOT send to Gemini).
    """
    hospital = sim_state["hospital"]
    rows = len(hospital)
    cols = len(hospital[0])

    # Extract spawn and waiting room positions
    spawn_point = sim_state.get("spawn_point", (0, 0))
    waiting_room_pos = sim_state.get("waiting_room_pos", (0, 1))

    # Separate treatment rooms by severity
    low_severity_rooms = []
    high_severity_rooms = []
    for pos, info in sim_state.get("treatment_rooms", {}).items():
        room_data = {"position": pos, "severity_type": info.get("severity_type", 0)}
        if info.get("severity_type", 0) == 0:
            low_severity_rooms.append(room_data)
        else:
            high_severity_rooms.append(room_data)

    # Get nurse and doctor positions
    nurses = sim_state.get("nurses", [])
    doctors = sim_state.get("doctors", [])
    nurse_idle_positions = [n.idle_position for n in nurses]
    doctor_idle_positions = [d.idle_position for d in doctors]

    # Extract congestion anomalies
    congested_points = []
    if anomaly_results:
        if isinstance(anomaly_results, dict):
            # From WoodWide or local detection
            if "anomalies" in anomaly_results:
                # Local IQR format
                high_cong = anomaly_results.get("anomalies", {}).get("high_congestion", [])
                congested_points = sorted(high_cong, key=lambda x: x["congestion"], reverse=True)[:10]
            elif "congested_points" in anomaly_results:
                congested_points = anomaly_results.get("congested_points", [])[:10]

    # If no anomalies found, get top congestion cells manually
    if not congested_points:
        flat_congestion = []
        for r in range(rows):
            for c in range(cols):
                if avg_congestion[r, c] > 0:
                    flat_congestion.append({"row": r, "col": c, "congestion": float(avg_congestion[r, c])})
        flat_congestion.sort(key=lambda x: x["congestion"], reverse=True)
        congested_points = flat_congestion[:10]

    # Build the prompt
    prompt_lines = [
        "=" * 70,
        "GEMINI PROMPT: ER HOSPITAL SETUP IMPROVEMENT REQUEST",
        "=" * 70,
        "",
        "You are an expert in emergency room operations and hospital layout optimization.",
        "Analyze the following hospital simulation setup and congestion data, then suggest",
        "improvements to reduce bottlenecks and improve patient flow.",
        "",
        "-" * 70,
        "HOSPITAL LAYOUT",
        "-" * 70,
        f"Grid dimensions: {rows} rows x {cols} columns",
        "",
        "Grid encoding:",
        "  -2 = Wall (impassable)",
        "  -1 = Spawn point",
        "   0 = Free space (walkable corridor)",
        "   1 = Waiting room",
        "   4 = Low severity treatment room",
        "   5 = High severity treatment room",
        "",
        "Hospital grid:",
    ]

    for r, row in enumerate(hospital):
        prompt_lines.append(f"  Row {r}: {row}")

    prompt_lines.extend([
        "",
        "-" * 70,
        "KEY LOCATIONS",
        "-" * 70,
        f"Spawn point (patient entry): {spawn_point}",
        f"Waiting room: {waiting_room_pos}",
        "",
        f"Nurse idle positions ({len(nurse_idle_positions)} nurses): {nurse_idle_positions}",
        f"Doctor idle positions ({len(doctor_idle_positions)} doctors): {doctor_idle_positions}",
        "",
        f"LOW SEVERITY treatment rooms ({len(low_severity_rooms)}):",
    ])

    for room in low_severity_rooms:
        prompt_lines.append(f"  - Position: {room['position']}")

    prompt_lines.append(f"\nHIGH SEVERITY treatment rooms ({len(high_severity_rooms)}):")
    for room in high_severity_rooms:
        prompt_lines.append(f"  - Position: {room['position']}")

    prompt_lines.extend([
        "",
        "-" * 70,
        "CONGESTION ANALYSIS - HIGHEST ANOMALIES",
        "-" * 70,
        f"Total grid cells analyzed: {rows * cols}",
        f"Max congestion: {np.max(avg_congestion):.4f}",
        f"Mean congestion: {np.mean(avg_congestion):.4f}",
        "",
        "Top congestion hotspots (potential bottlenecks):",
    ])

    for i, point in enumerate(congested_points, 1):
        r = point.get("row", point.get("position", [0, 0])[0] if isinstance(point.get("position"), tuple) else 0)
        c = point.get("col", point.get("position", [0, 0])[1] if isinstance(point.get("position"), tuple) else 0)
        cong = point.get("congestion", 0)
        prompt_lines.append(f"  {i}. Grid position ({r}, {c}): congestion = {cong:.4f}")

    prompt_lines.extend([
        "",
        "-" * 70,
        "REQUEST",
        "-" * 70,
        "Based on this hospital setup and congestion data, please provide:",
        "",
        "1. BOTTLENECK DIAGNOSIS:",
        "   - What are the likely causes of congestion at the identified hotspots?",
        "   - How does the current layout contribute to these bottlenecks?",
        "",
        "2. LAYOUT IMPROVEMENTS:",
        "   - Suggest specific changes to room positions or corridor layout",
        "   - Recommend optimal placement for treatment rooms relative to spawn/waiting",
        "",
        "3. STAFFING RECOMMENDATIONS:",
        "   - Should nurse/doctor positions be adjusted?",
        "   - Are there enough staff for the current patient flow?",
        "",
        "4. OPERATIONAL CHANGES:",
        "   - Routing improvements for patient flow",
        "   - Queue management suggestions",
        "",
        "=" * 70,
    ])

    prompt_text = "\n".join(prompt_lines)

    tc = TokenClient(api_key=os.environ.get("TOKENC"))
 
    compressed = tc.compress_input(
    input=prompt_text,
    aggressiveness=0.8
    )

    # Print the prompt
    print("\n" + prompt_text)

    return prompt_text


def display_anomaly_results(results, valid_points, grid_shape=None, *, only_congested=True, top_n=10, show_grid=True):
    """
    Parse & display Wood Wide AI results.

    Handles BOTH formats:
      A) {"prediction": {"0":"dead_zone", ...}, "prediction_probs": {"0":0.99, ...}}
      B) list-like predictions (older / different endpoints)

    Args:
        results: WoodWide response JSON
        valid_points: list of {"row","col","congestion"} in the SAME ORDER as your test CSV rows
        grid_shape: (rows, cols) to build a 2D grid. If None, we infer from max row/col in valid_points.
        only_congested: print only congested points
        top_n: show top N congested points by congestion
        show_grid: if True, print a 2D label grid (ASCII) for quick sanity check
    """
    import json

    if not results:
        print("No results returned from analysis.")
        return

    # --- helper: decide if label is "congested" ---
    congested_keywords = ("high_congestion", "high", "congest", "bottleneck", "anomal")

    def is_congested_label(label: str) -> bool:
        s = (label or "").lower()
        return any(k in s for k in congested_keywords) and ("dead" not in s) and ("zero" not in s)

    # --- normalize to a per-index label/prob dict ---
    pred_map = None
    prob_map = None

    # WoodWide format (what you pasted)
    if isinstance(results, dict) and isinstance(results.get("prediction"), dict):
        pred_map = results.get("prediction", {})
        prob_map = results.get("prediction_probs", {}) if isinstance(results.get("prediction_probs"), dict) else {}

    # Other possible shapes (older)
    elif isinstance(results, dict) and "predictions" in results:
        # Try to turn list into dict by index
        preds = results["predictions"]
        if isinstance(preds, list):
            pred_map = {str(i): (p.get("prediction") if isinstance(p, dict) else str(p)) for i, p in enumerate(preds)}
        else:
            pred_map = preds if isinstance(preds, dict) else None

    elif isinstance(results, list):
        pred_map = {str(i): (p.get("prediction") if isinstance(p, dict) else str(p)) for i, p in enumerate(results)}

    if not pred_map:
        print("Raw response from Wood Wide AI:")
        print(json.dumps(results, indent=2))
        return

    # --- infer grid shape if not provided ---
    if grid_shape is None:
        max_r = max(p["row"] for p in valid_points) if valid_points else 0
        max_c = max(p["col"] for p in valid_points) if valid_points else 0
        grid_shape = (max_r + 1, max_c + 1)

    rows, cols = grid_shape

    # --- build 2D label grid (None where not in valid_points) ---
    label_grid = [[None for _ in range(cols)] for _ in range(rows)]
    prob_grid = [[None for _ in range(cols)] for _ in range(rows)]

    category_counts = {}
    congested_points = []

    # IMPORTANT: valid_points order == CSV row order == prediction index order
    for i in range(len(valid_points)):
        key = str(i)
        label = pred_map.get(key, "unknown")
        prob = prob_map.get(key, None)

        r = int(valid_points[i]["row"])
        c = int(valid_points[i]["col"])
        cong = float(valid_points[i]["congestion"])

        if 0 <= r < rows and 0 <= c < cols:
            label_grid[r][c] = label
            prob_grid[r][c] = prob

        category_counts[label] = category_counts.get(label, 0) + 1

        if is_congested_label(label):
            congested_points.append({
                "row": r, "col": c, "congestion": cong, "label": label,
                "prob": float(prob) if prob is not None else None
            })

    # --- output congested points ---
    if only_congested:
        if not congested_points:
            print("✅ No congested anomalies detected.")
        else:
            congested_points.sort(key=lambda x: x["congestion"], reverse=True)

            print("\n" + "-" * 60)
            print("🔴 CONGESTED POINTS (2D COORDS ONLY)")
            print("-" * 60)
            print(f"Found {len(congested_points)} congested points. Showing top {min(top_n, len(congested_points))}:\n")

            for p in congested_points[:top_n]:
                prob_txt = f" | prob={p['prob']:.3f}" if p["prob"] is not None else ""
                print(f" → Grid ({p['row']}, {p['col']}): congestion={p['congestion']:.4f} | label={p['label']}{prob_txt}")

            if len(congested_points) > top_n:
                print(f"\n ... and {len(congested_points) - top_n} more congested points")

    # --- optional: quick 2D grid visualization ---
    if show_grid:
        # compact symbols
        def sym(label):
            if label is None:
                return " "   # not in valid_points
            s = label.lower()
            if "dead" in s:
                return "."
            if is_congested_label(label):
                return "X"
            return "o"

        print("\n" + "-" * 60)
        print("🧱 2D LABEL GRID (X=congested, o=normal, .=dead/near-zero)")
        print("-" * 60)
        for r in range(rows):
            print("".join(sym(label_grid[r][c]) for c in range(cols)))

    # tiny distribution summary (useful sanity check)
    if not only_congested:
        print("\n🔢 Prediction Distribution:")
        for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
            print(f" - {cat}: {count}")

    return {
        "label_grid": label_grid,
        "prob_grid": prob_grid,
        "congested_points": congested_points,
        "category_counts": category_counts,
        "grid_shape": grid_shape,
    }



if __name__ == "__main__":
    print("=" * 60)
    print("ER SIMULATION WITH WOOD WIDE AI INTEGRATION")
    print("=" * 60)
    print("\nTo enable anomaly detection, set your API key:")
    print(" export WOODWIDE_API_KEY='sk_your_api_key_here'")
    print("\nOptionally set custom base URL:")
    print(" export WOODWIDE_BASE_URL='https://beta.woodwide.ai'")
    print("=" * 60 + "\n")

    # Default hospital layout
    hospital = [
        [-1, 1, -2, -2, -2],
        [-2, 0, 0, 0, -2],
        [-2, 0, 0, 0, -2],
        [-2, 0, 0, 0, -2],
    ]

    nurse_positions = [(1, 1), (1, 2), (1, 3)]
    doctor_positions = [(2, 1), (2, 2)]

    # Test 1
    treatment_rooms = {
        (2, 4): {'severity_type': 0, 'occupancy': 0},
        (3, 1): {'severity_type': 1, 'occupancy': 0}
    }

    # Test 2
    treatment_rooms = {
        (1, 0): {'severity_type': 0, 'occupancy': 0},
        (3, 4): {'severity_type': 1, 'occupancy': 0}
    }

    sim_state = create_simulation(
        hospital=hospital,
        nurse_positions=nurse_positions,
        doctor_positions=doctor_positions,
        treatment_rooms_config=treatment_rooms,
    )

    run_visual(sim_state, max_ticks=103, interval=50)



