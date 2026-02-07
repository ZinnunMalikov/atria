class Patient:
    count = 0
    next_id = 0
    def __init__(self, severity, position):
        self.severity = severity
        self.position = position
        Patient.next_id += 1
        Patient.count = Patient.next_id
        self.id = Patient.count
    
    def __lt__(self, other):
        return self.severity > other.severity  # MAX-heap

class Nurse:
    count = 0
    def __init__(self, state, idle_position):
        self.state = state
        self.idle_position = idle_position
        self.position = idle_position
        Nurse.count += 1
        self.id = Nurse.count

class Doctor:
    count = 0
    def __init__(self, state, idle_position):
        self.state = state
        self.idle_position = idle_position
        self.position = idle_position
        Doctor.count += 1
        self.id = Doctor.count

# a-star for pathfinding
def get_path(grid, start, end):
    from queue import PriorityQueue
    rows, cols = len(grid), len(grid[0])
    open_set = PriorityQueue()
    open_set.put((0, start))
    came_from = {}
    g_score = {start: 0}
    f_score = {start: heuristic(start, end)}
    dir = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    while not open_set.empty():
        curr = open_set.get()[1]
        if curr == end:
            return reconstruct_path(came_from, curr)
        for d in dir:
            neighbor = (curr[0] + d[0], curr[1] + d[1])
            if 0 <= neighbor[0] < rows and 0 <= neighbor[1] < cols:
                cell_value = grid[neighbor[0]][neighbor[1]]

                if cell_value == -2:
                    continue
                if cell_value in [-1, 4, 5] and neighbor != end:
                    continue

                tent_g_score = g_score[curr] + 1
                if tent_g_score < g_score.get(neighbor, float('inf')):
                    came_from[neighbor] = curr
                    g_score[neighbor] = tent_g_score
                    f_score[neighbor] = tent_g_score + heuristic(neighbor, end)
                    if neighbor not in [i[1] for i in open_set.queue]:
                        open_set.put((f_score[neighbor], neighbor))
    return []

def heuristic(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def reconstruct_path(came_from, curr):
    total_path = [curr]
    while curr in came_from:
        curr = came_from[curr]
        total_path.append(curr)
    total_path.reverse()
    return total_path



    



