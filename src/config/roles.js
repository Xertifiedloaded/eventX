const allRoles = {
  user: [
    "getUsers",
    "manageUsers",
    "getEvents",
    "manageEvents",
    "manageLocations",
  ],
  admin: [
    "getUsers",
    "manageUsers",
    "getEvents",
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
