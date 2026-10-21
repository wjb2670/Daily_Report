// Who can use which part of the Field Reports app.
//
// Roles are kept in the "App Access" list on the Field Reports site and
// managed on the Access page. Anyone not on the list is Field.

export const ROLES = ['Field', 'Reports only', 'Office', 'PM', 'Admin'];

export const ROLE_HELP = {
  Field: 'Daily reports for the projects they are assigned to.',
  'Reports only': 'View and print reports, and look at projects. Can’t change anything.',
  Office: 'Daily reports for every project, reports, adding or updating projects, and creating subcontracts from approved scopes.',
  PM: 'Everything Office can do, plus writing and approving subcontract scopes and editing the scope library.',
  Admin: 'Everything, including the Access page and Site setup.',
};

// Always Admin, even before the App Access list exists, so the app can be
// set up and access can never be locked out.
export const OWNERS = ['wendy@whayland.com'];

// Added to the App Access list the first time Site setup creates it.
export const INITIAL_ACCESS = [
  { name: 'Wendy Blough', email: 'wendy@whayland.com', role: 'Admin' },
  { name: 'Eric Butler', email: 'eric@whayland.com', role: 'Office' },
  { name: 'Steve Hentschel', email: 'steve@whayland.com', role: 'Office' },
  { name: 'Kendra Pleasants', email: 'kendra@whayland.com', role: 'Office' },
];

// area → roles that may open it
const AREAS = {
  daily: ['Field', 'Office', 'PM', 'Admin'],
  home: ['Reports only', 'Office', 'PM', 'Admin'], // the modules home screen
  allProjects: ['Office', 'PM', 'Admin'], // every project in Daily Report, not just assigned ones
  reports: ['Reports only', 'Office', 'PM', 'Admin'],
  projectsView: ['Reports only', 'Office', 'PM', 'Admin'],
  projectsEdit: ['Office', 'PM', 'Admin'],
  subsView: ['Reports only', 'Office', 'PM', 'Admin'], // subcontracts with prices
  subsContract: ['Office', 'PM', 'Admin'], // create contract files once a scope is approved
  scopesEdit: ['PM', 'Admin'], // write/approve scopes, edit the library
  fieldScopes: ['Field', 'Office', 'PM', 'Admin'], // approved scopes, no prices
  admin: ['Admin'],
};

let current = 'Field';
export const currentRole = () => current;
export const setCurrentRole = role => { current = ROLES.includes(role) ? role : 'Field'; };
export const can = (area, role = current) => (AREAS[area] || []).includes(role);
