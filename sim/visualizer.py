import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.animation import FuncAnimation
import numpy as np

class HospitalVisualizer:
    def __init__(self, hospital, nurses, doctors, treatment_rooms):
        self.hospital = hospital
        self.nurses = nurses
        self.doctors = doctors
        self.treatment_rooms = treatment_rooms

        self.rows = len(hospital)
        self.cols = len(hospital[0])

        # Track previous positions for smooth interpolation
        self.prev_positions = {}
        self.current_positions = {}

        # Create figure with two subplots side by side
        self.fig, (self.ax_grid, self.ax_heatmap) = plt.subplots(1, 2, figsize=(16, 6))
        self.fig.suptitle('ER Simulation', fontsize=16, fontweight='bold')

        # Colors
        self.colors = {
            'wall': '#2C3E50',
            'spawn': '#95A5A6',
            'free': '#ECF0F1',
            'waiting': '#F39C12',
            'treatment_low': '#3498DB',
            'treatment_high': '#E74C3C',
            'nurse': '#2ECC71',
            'doctor': '#9B59B6',
            'patient_low': '#1ABC9C',
            'patient_high': '#C0392B'
        }

        # Interpolation settings
        self.num_interp_frames = 5  # Number of frames to interpolate between ticks
        self.current_frame = 0

        self.setup_grid()
        self.setup_heatmap()

    def setup_grid(self):
        self.ax_grid.set_xlim(-0.5, self.cols - 0.5)
        self.ax_grid.set_ylim(-0.5, self.rows - 0.5)
        self.ax_grid.set_aspect('equal')
        self.ax_grid.invert_yaxis()
        self.ax_grid.set_xticks(range(self.cols))
        self.ax_grid.set_yticks(range(self.rows))
        self.ax_grid.grid(True, alpha=0.3, linewidth=1.5)
        self.ax_grid.set_title('Hospital Layout', fontsize=12, fontweight='bold')

        # Draw background cells
        for r in range(self.rows):
            for c in range(self.cols):
                cell_value = self.hospital[r][c]

                if cell_value == -2:  # Wall
                    color = self.colors['wall']
                elif cell_value == -1:  # Spawn
                    color = self.colors['spawn']
                elif cell_value == 0:  # Free
                    color = self.colors['free']
                elif cell_value == 1:  # Waiting room
                    color = self.colors['waiting']
                elif cell_value == 4:  # Low severity treatment
                    color = self.colors['treatment_low']
                elif cell_value == 5:  # High severity treatment
                    color = self.colors['treatment_high']
                else:
                    color = self.colors['free']

                rect = patches.Rectangle((c - 0.5, r - 0.5), 1, 1,
                                         linewidth=0, facecolor=color, alpha=0.3)
                self.ax_grid.add_patch(rect)

                # Add cell labels
                labels = {-2: 'WALL', -1: 'SPAWN', 0: '', 1: 'WAIT', 4: 'LOW', 5: 'HIGH'}
                if cell_value in labels and labels[cell_value]:
                    self.ax_grid.text(c, r, labels[cell_value],
                                    ha='center', va='center',
                                    fontsize=8, alpha=0.5, fontweight='bold')

        # Legend
        legend_elements = [
            patches.Patch(facecolor=self.colors['nurse'], label='Nurse'),
            patches.Patch(facecolor=self.colors['doctor'], label='Doctor'),
            patches.Patch(facecolor=self.colors['patient_low'], label='Patient (Low)'),
            patches.Patch(facecolor=self.colors['patient_high'], label='Patient (High)')
        ]
        self.ax_grid.legend(handles=legend_elements, loc='upper left',
                          bbox_to_anchor=(0, -0.05), ncol=4, fontsize=9)

    def setup_heatmap(self):
        self.ax_heatmap.set_title('Entity Density Heatmap', fontsize=12, fontweight='bold')
        self.heatmap_data = np.zeros((self.rows, self.cols))
        self.heatmap_img = self.ax_heatmap.imshow(self.heatmap_data,
                                                  cmap='YlOrRd',
                                                  interpolation='nearest',
                                                  vmin=0, vmax=5)
        self.ax_heatmap.set_xticks(range(self.cols))
        self.ax_heatmap.set_yticks(range(self.rows))
        self.ax_heatmap.grid(True, alpha=0.3, linewidth=1.5, color='white')

        # Add colorbar
        cbar = plt.colorbar(self.heatmap_img, ax=self.ax_heatmap)
        cbar.set_label('Number of Entities', rotation=270, labelpad=20)

        # Text annotations for counts
        self.heatmap_texts = []
        for r in range(self.rows):
            row_texts = []
            for c in range(self.cols):
                text = self.ax_heatmap.text(c, r, '0', ha='center', va='center',
                                           fontsize=14, fontweight='bold', color='black')
                row_texts.append(text)
            self.heatmap_texts.append(row_texts)

    def get_entity_positions(self, active_tasks):
        positions = {}

        # Add nurses
        for nurse in self.nurses:
            pos = nurse.position
            if pos not in positions:
                positions[pos] = {'nurses': [], 'doctors': [], 'patients': []}
            positions[pos]['nurses'].append(nurse)

        # Add doctors
        for doctor in self.doctors:
            pos = doctor.position
            if pos not in positions:
                positions[pos] = {'nurses': [], 'doctors': [], 'patients': []}
            positions[pos]['doctors'].append(doctor)

        # Add patients
        for task in active_tasks:
            if 'patient' in task:
                pos = task['patient'].position
                if pos not in positions:
                    positions[pos] = {'nurses': [], 'doctors': [], 'patients': []}
                positions[pos]['patients'].append(task['patient'])

        return positions

    def get_entity_id(self, entity_type, entity):
        """Get unique ID for an entity"""
        if entity_type == 'nurse':
            return f'nurse_{entity.id}'
        elif entity_type == 'doctor':
            return f'doctor_{entity.id}'
        elif entity_type == 'patient':
            return f'patient_{entity.id}'
        return None

    def update(self, tick_data):
        # Unpack the interpolation data
        tick = tick_data['tick']
        active_tasks = tick_data['active_tasks']
        stats = tick_data['stats']
        prev_positions = tick_data['prev_positions']
        curr_positions = tick_data['curr_positions']
        t = tick_data['interp_t']
        swaps = tick_data.get('swaps', [])

        # Clear previous entities
        for artist in self.ax_grid.patches[self.rows * self.cols:]:
            artist.remove()

        # Get entity positions with interpolation
        interpolated_positions = {}

        # Interpolate all entities
        all_entity_ids = set(prev_positions.keys()) | set(curr_positions.keys())

        for entity_id in all_entity_ids:
            # Get prev and current positions (use current if new entity, prev if removed)
            prev_pos = prev_positions.get(entity_id, curr_positions.get(entity_id))
            curr_pos = curr_positions.get(entity_id, prev_positions.get(entity_id))

            # Interpolate between prev and current
            r_prev, c_prev = prev_pos
            r_curr, c_curr = curr_pos

            r_interp = r_prev + (r_curr - r_prev) * t
            c_interp = c_prev + (c_curr - c_prev) * t

            interp_pos = (r_interp, c_interp)

            if interp_pos not in interpolated_positions:
                interpolated_positions[interp_pos] = []
            interpolated_positions[interp_pos].append(entity_id)

        # Update heatmap data (use final positions for heatmap)
        self.heatmap_data = np.zeros((self.rows, self.cols))

        # Build a set of swapping entity IDs for quick lookup
        swapping_entity_ids = set()
        swap_positions_map = {}  # Maps entity_id to both positions it should be counted in

        for swap in swaps:
            pos1, pos2, type1, id1, type2, id2 = swap
            entity_id1 = f'{type1}_{id1}'
            entity_id2 = f'{type2}_{id2}'
            swapping_entity_ids.add(entity_id1)
            swapping_entity_ids.add(entity_id2)
            swap_positions_map[entity_id1] = [pos1, pos2]
            swap_positions_map[entity_id2] = [pos1, pos2]

        # Count entities in heatmap
        for entity_id, pos in curr_positions.items():
            if entity_id in swapping_entity_ids:
                # This entity is swapping, count it in BOTH positions
                for swap_pos in swap_positions_map[entity_id]:
                    r, c = swap_pos
                    self.heatmap_data[r, c] += 1
            else:
                # Normal case: count in current position only
                r, c = pos
                self.heatmap_data[r, c] += 1

        # Draw entities as circles at interpolated positions
        for interp_pos, entity_ids in interpolated_positions.items():
            r_interp, c_interp = interp_pos

            # Calculate positions for multiple entities in same cell
            all_entities = []

            for entity_id in entity_ids:
                entity_type = entity_id.split('_')[0]

                if entity_type == 'nurse':
                    nurse_id = int(entity_id.split('_')[1])
                    nurse = next(n for n in self.nurses if n.id == nurse_id)
                    all_entities.append(('nurse', nurse))
                elif entity_type == 'doctor':
                    doctor_id = int(entity_id.split('_')[1])
                    doctor = next(d for d in self.doctors if d.id == doctor_id)
                    all_entities.append(('doctor', doctor))
                elif entity_type == 'patient':
                    patient_id = int(entity_id.split('_')[1])
                    # Find patient in active tasks
                    for task in active_tasks:
                        if 'patient' in task and task['patient'].id == patient_id:
                            patient = task['patient']
                            severity_high = patient.severity >= 4
                            all_entities.append(('patient', patient, severity_high))
                            break

            # Draw entities in a circle around the cell center
            num_entities = len(all_entities)
            if num_entities == 1:
                positions_offset = [(0, 0)]
            elif num_entities == 2:
                positions_offset = [(-0.15, 0), (0.15, 0)]
            elif num_entities == 3:
                positions_offset = [(-0.15, -0.15), (0.15, -0.15), (0, 0.15)]
            elif num_entities == 4:
                positions_offset = [(-0.15, -0.15), (0.15, -0.15), (-0.15, 0.15), (0.15, 0.15)]
            else:
                # Arrange in circle
                angles = np.linspace(0, 2*np.pi, num_entities, endpoint=False)
                positions_offset = [(0.2*np.cos(a), 0.2*np.sin(a)) for a in angles]

            for i, entity_info in enumerate(all_entities):
                entity_type = entity_info[0]
                offset_x, offset_y = positions_offset[i]

                if entity_type == 'nurse':
                    color = self.colors['nurse']
                    radius = 0.12
                elif entity_type == 'doctor':
                    color = self.colors['doctor']
                    radius = 0.12
                elif entity_type == 'patient':
                    severity_high = entity_info[2]
                    color = self.colors['patient_high'] if severity_high else self.colors['patient_low']
                    radius = 0.10

                circle = patches.Circle((c_interp + offset_x, r_interp + offset_y), radius,
                                       facecolor=color, edgecolor='black', linewidth=2)
                self.ax_grid.add_patch(circle)

        # Update heatmap
        self.heatmap_img.set_data(self.heatmap_data)

        # Update heatmap text annotations
        for r in range(self.rows):
            for c in range(self.cols):
                count = int(self.heatmap_data[r, c])
                self.heatmap_texts[r][c].set_text(str(count) if count > 0 else '')
                # Change text color based on background
                if count > 2:
                    self.heatmap_texts[r][c].set_color('white')
                else:
                    self.heatmap_texts[r][c].set_color('black')

        # Update title with stats
        self.fig.suptitle(
            f'ER Simulation - Tick {tick} | '
            f'Active Patients: {stats["active_patients"]} | '
            f'Waiting: {stats["waiting"]} | '
            f'Nurses: {stats["nurses_busy"]}/{stats["nurses_total"]} | '
            f'Doctors: {stats["doctors_busy"]}/{stats["doctors_total"]}',
            fontsize=14, fontweight='bold'
        )

        return self.ax_grid.patches + [self.heatmap_img]

    def show(self):
        plt.tight_layout()
        plt.show()
