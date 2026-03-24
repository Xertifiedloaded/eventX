const allRoles = {
  user: [
    "getEvents",
    'editUser',
    "manageEvents",
    "manageLocations",
  ],
  admin: [
    "getUsers",
    "manageUsers",
    "getEvents",
    'editUser',
    "manageEvents",
    "manageLocations",
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
