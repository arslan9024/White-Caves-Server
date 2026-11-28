export interface ManagerProfile {
  id: string;
  name: string;
  departmentCode: string;
  directorId: string;
  divisionCode: string;
  divisionIndex: number;
}

const NAMED_MANAGERS: Record<string, string> = {
  'MGR-01-1': 'Linda',
  'MGR-02-1': 'Mary',
  'MGR-03-1': 'Daisy',
  'MGR-04-1': 'Henry',
};

export class DivisionRegistry {
  private readonly managers: Map<string, ManagerProfile> = new Map();

  constructor() {
    this.seedManagers();
  }

  private seedManagers(): void {
    for (let dept = 1; dept <= 12; dept++) {
      const deptPad = String(dept).padStart(2, '0');
      const departmentCode = `DEPT-${deptPad}`;
      const directorId = `DIR-${deptPad}`;

      for (let div = 1; div <= 9; div++) {
        const id = `MGR-${deptPad}-${div}`;
        const divisionCode = `DIV-${deptPad}-${div}`;
        const name = NAMED_MANAGERS[id] ?? `Manager ${deptPad}-${div}`;

        this.managers.set(id, {
          id,
          name,
          departmentCode,
          directorId,
          divisionCode,
          divisionIndex: div,
        });
      }
    }
  }

  getManagerCount(): number {
    return this.managers.size;
  }

  getAllManagers(): ManagerProfile[] {
    return Array.from(this.managers.values());
  }

  getManager(managerId: string): ManagerProfile | undefined {
    return this.managers.get(managerId);
  }

  findManagerByName(name: string): ManagerProfile | undefined {
    const target = name.trim().toLowerCase();
    return Array.from(this.managers.values()).find(
      (m) => m.name.toLowerCase() === target
    );
  }

  getManagersByDepartment(departmentCode: string): ManagerProfile[] {
    return Array.from(this.managers.values()).filter(
      (m) => m.departmentCode === departmentCode
    );
  }

  getManagersByDirector(directorId: string): ManagerProfile[] {
    return Array.from(this.managers.values()).filter(
      (m) => m.directorId === directorId
    );
  }
}
