// Source of truth: data_dictionary-DRIVERPEOPLE.txt, Table 1: Role
const ROLES = {
  EXEC: 'EXEC',
  FLEET_MGR: 'FLEET_MGR',
  SITE_ENG: 'SITE_ENG',
  PM: 'PM',
  MECH: 'MECH',
  MECH_SUP: 'MECH_SUP',
  HSE: 'HSE',
  FINANCE: 'FINANCE',
  SYS_ADMIN: 'SYS_ADMIN',
  // ADDED — not in the dictionary's role list. Driver.employee_id is a mandatory FK to
  // Employee, but drivers/operators are field personnel who never log into the EMS
  // (no use cases for them in UML_PART_A). Without *some* role, registerDriver() can't
  // satisfy Employee's NOT NULL role_id. This role's Employee rows are created with
  // isActive=false so login() rejects them — they exist for identity linkage only,
  // never for authentication. Flagging so Role's seed list can be confirmed with mentors.
  DRIVER: 'DRIVER',
};

module.exports = { ROLES };
