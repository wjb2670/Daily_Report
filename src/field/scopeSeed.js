// Starting scope library, taken from Whayland's own Scopes Master workbooks
// (2026-21 Lincoln EMS, 2025-08 Ocean Pines VFD) and the Exhibit A of a
// signed subcontract (2026-21-28). PMs edit all of this in the app.
//
// [square brackets] = a blank the PM fills in for each job.
// {project} and {company} are filled in automatically.
// "sub" lines print as a., b., c. under the line above.

export const STANDARD_CONDITIONS = [
  'Scope of work per below and Exhibits. Drawings and specifications supersede all other documents.',
  'All work to be completed per code, drawings and specifications unless otherwise directed.',
  'The subcontractor is responsible for all cleanup of debris and trash from employees daily. If Whayland or the Owner must clean up after your workers, you will be back charged.',
  'You are responsible for all tools, equipment, supplies, and materials brought to the site for your scope of work. It is your responsibility to store goods in a safe, locked area.',
  'Safety is of utmost importance. You are required to always have a competent safety representative on site who is the responsible person representing your company.',
  'OSHA approved equipment and employee certified users are always required.',
  { text: 'Safety Violations, as determined by Site Superintendents or other Whayland Staff, will be handled as follows:', sub: ['1st Violation = Warning Letter sent to Company', '2nd Violation = $250 Fine (Deduct Change Order)', '3rd Violation = $500 Fine (Deduct Change Order) and dismissal from site'] },
  'All project submittals are to be sent electronically to [PM email] ASAP for approval and physical samples as needed or requested by the Owner.',
  'It is the subcontractor’s responsibility to lock in material pricing for this project based on the agreed upon contract amount. Whayland understands the current economic landscape that we are dealing with pertaining to price escalation and availabilities. Whayland and ownership expect the subcontractor and your vendors to do everything within your power to hold pricing and get inventory onsite or stored offsite as soon as possible that has been approved by Whayland and ownership, if applicable. If a price escalation is known and is not negotiable present to Whayland the original estimate or invoice on the vendors format, along with the updated pricing from the vendor. Whayland will do our best to present to ownership to try and get a cost for cost change order on your behalf. We will not allow profit or overhead and the additional cost is not a guarantee of approval until a formal change order is executed.',
  'All Fire Stopping & Caulking related to your works penetrations.',
  'Must submit all close out documents to include the standardized warranty letter on Trade Contractors Company letterhead.',
  'Mandatory attendance is required at all progress meetings by a responsible company representative.',
].map(x => (typeof x === 'string' ? { text: x, on: true } : { on: true, ...x }));

export const OPENING = [
  { text: 'Provide all necessary equipment, material, labor and supervision to provide [work description], per plans and specifications, for the {project} project.', on: true },
  { text: 'Includes working with & accommodating all 3rd party testing required by project specifications.', on: true },
  { text: 'Specification section governing this scope is [spec section].', on: true },
  { text: 'Includes all permits, licensing, inspections, and coordination with other entities as needed to provide as quoted on [quote date].', on: false },
  { text: 'To be completed as quoted in {company} proposal #[proposal number].', on: false },
];

export const CLOSING = [
  { text: 'Includes removal of all remaining spoils after project completion. Spoils may be removed to an onsite location as designated by the client or Whayland superintendent.', on: false },
  { text: 'Contractor will coordinate with flashing, framing, and all other trades as needed to deliver a finished product, per plans and specifications.', on: false },
  { text: 'All materials shall meet or exceed the requirements of applicable building codes and industry standards.', on: true },
  { text: 'Contractor will adhere to all relevant building codes and industry best practices throughout the installation. Regular inspections by a qualified inspector will be required.', on: true },
  { text: 'All equipment and materials are to be submitted and are subject to review and approval by Owners, Architect and/or Engineers.', on: true },
  { text: 'All work is to be sequenced and properly staffed to accommodate project schedules as required within the time allotted.', on: true },
  { text: 'All construction debris is to be removed to designated dumpsters and areas left clean daily.', on: true },
  { text: 'Any areas not clean or punch items not corrected will be cause for delay of payments.', on: true },
];

const t = (costCode, name, workName, items) => ({ costCode, name, workName, items: items.map(i => (typeof i === 'string' ? { text: i, on: true } : { on: true, ...i })) });

export const TRADES = [
  t('1410', 'Quality Control / Testing & Inspection', 'TESTING & INSPECTION', [
    'Includes all required licensing, inspections, and coordination with various subcontractors and other entities as needed.',
    'Includes soils/earthwork scopes for fill placement, utilities, and foundations stated in the plans & specifications.',
    'Includes concrete scopes for cast-in-place and reinforcing steel applications stated in the plans & specifications.',
    'Includes pavement scopes and applications stated in the plans & specifications.',
    { text: 'Includes wood framing scopes for applications stated in the plans & specifications.', on: false },
    'Includes general engineering services.',
    'All test results and inspection reports are to be submitted to Whayland and are subject to review and approval by Owners, Architect and/or Engineers.',
  ]),
  t('2050', 'Demolition', 'DEMOLITION', [
    'Includes complete demolition and disposal of [structure to be demolished].',
    'Includes removal and disposal of all remaining contents, equipment, structure, concrete block, foundation walls, foundation footers, and concrete slabs per quote dated [quote date].',
    { text: 'Includes capping and termination of utilities as required, coordinated with the utility companies.', on: false },
  ]),
  t('2100', 'Site Work, Grading & SWM', 'SITE WORK', [
    'Includes supply and placement of construction entrance, concrete washout station, standard silt fencing, traffic control, dust control, and site dewatering (if required) as shown on plans and as described in project specifications.',
    'Includes stripping approximately [depth]" of topsoil, to be stockpiled for later use.',
    'Includes excavation and installation of swales, berms, and all components, as specified in the project documents.',
    { text: 'Includes excavation and installation of water service system, as specified in the project documents.', on: false },
    { text: 'Includes excavation and installation of a storm water management system as specified in the project documents, including but not limited to;', sub: ['Supply & place #57 stone, perforated pipe, storm drain, S.D. inlets, inlet protection, flared end sections, roof drain transitions, clean outs, observation wells, associated/specified structures, connections, and extra materials.'] },
    { text: 'Includes excavation and installation of a submerged gravel wetland as specified in the project documents, including but not limited to;', on: false, sub: ['Forebays, equalization areas, berms, outlet protections, gravel, rock, structures, temporary & permanent stabilization, and extra materials as specified.'] },
    { text: 'Includes excavation and subgrade of building as specified in the project documents, including but not limited to;', sub: ['Import and placement of select fill, onsite borrowed materials, and fine grading as specified.'] },
    { text: 'Includes supply and installation of pavement as specified in the project documents, including but not limited to;', sub: ['Placement of onsite borrowed materials, rough grading, GABC, and fine grading.'] },
    'Includes site restoration by return & placement of topsoil, permanent grass seed, and mat.',
    'Includes removal of all remaining spoils after project completion. Spoils may be removed to an onsite location as designated by the client or Whayland superintendent.',
  ]),
  t('2250', 'Soil Treatment (Termite)', 'SOIL TREATMENT', [
    'Includes preventative soil termite treatment per plans and specifications.',
    'Includes warranty as specified in specification section [spec section].',
    'Includes application as specified in specification section [spec section].',
  ]),
  t('2517', 'Site Concrete, Sidewalks & Aprons', 'SITE CONCRETE', [
    'Includes excavation up to [depth] deep, fine grading, backfilling, and compaction of affected areas.',
    'Includes [square feet] sqft of 4" sidewalks and all associated subgrade materials, rebar, and sawcutting as specified in the project documents.',
    'Includes [square feet] sqft of 6" (heavy duty) concrete aprons and all associated subgrade materials, rebar, and sawcutting as specified in the project documents.',
    { text: 'Includes generator pad and MEP pads as shown on plan page [plan page].', on: false },
    { text: 'Includes labor and concrete to install ([quantity]) steel bollards (bollards provided by others).', on: false },
    'Concrete slump to be 4" plus/minus 1" and be 4000 psi @ 28 days or as stated in project drawings and specifications.',
    'Includes removal of all remaining spoils after project completion. Spoils may be removed to an onsite location as designated by the client or Whayland superintendent.',
  ]),
  t('2870', 'Septic', 'SEPTIC', [
    'Includes all permits, licensing, inspections, and coordination with the power company and all other entities as needed.',
    'Includes provide and install of [tank size] gallon septic tank, dosing chamber with pump, and all associated piping and fittings to connect to within 5\' of building footprint.',
    'Includes supply and install of alarm/timer control panel with elapsed time meter and event counter, connected to electrical panel.',
    'Includes supply and install of drainfield as specified in project documents.',
    'Includes covering of drainfield with topsoil, seed, and straw.',
  ]),
  t('2900', 'Landscape & Irrigation', 'LANDSCAPE & IRRIGATION', [
    'Includes provide and install of new landscaping per plans, including but not limited to plantings at new foundation and gravel around perimeter of building and around mechanical and electrical equipment.',
    { text: 'Includes provide and install of new landscaping in storm water area(s).', on: false },
    'Includes supply and install of sod in designated locations.',
    { text: 'Includes supply and install of complete irrigation system as specified in project documents, including but not limited to;', sub: ['Sleeving under parking lot (as required), connections, fittings, piping, testing, and start-up of system.', 'Compaction, backfill, and subgrade of affected areas to original state.'] },
  ]),
  t('3010', 'Concrete – Foundations & Slab', 'CONCRETE', [
    'Includes excavation up to 4\'-0" deep, backfilling, fine grading, sub-slab stone and compaction of affected areas.',
    'Concrete slump to be 4.5" plus/minus 1" and be 4000 psi @ 28 days or as stated in project drawings and specifications.',
    'Includes all associated forming, placement, finishing, curing, reinforcing materials, anchor bolts, and grouting of base plates as specified in the project documents.',
    { text: 'Includes exterior equipment pads as shown on [plan page] (excludes transformer pad – by others).', on: false },
    { text: 'Includes prep and placement of ([quantity]) steel bollards (bollards provided by others).', on: false },
    { text: 'Includes ([quantity]) flagpole base footing as shown on [plan page] (plates, sleeve, and flagpole by others).', on: false },
    'Includes removal of all remaining spoils after project completion. Spoils may be removed to an onsite location as designated by the client or Whayland superintendent.',
  ]),
  t('4020', 'Masonry – CMU & Stone Veneer', 'MASONRY', [
    { text: 'Furnish and install all grout, rebar, horizontal reinforcement, control joints, CMU lintels, anchor bolts, and foundation insulation per plans and specifications.', on: false },
    'Furnish and install manufactured stone veneer and all associated anchors and accessories per plans and specifications.',
    'Includes all cement substrate, waterproofing, air/water barrier, veneer mortar, flashing tape around windows & doors, drainage mat, weep screed, wire lath, and all other associated miscellaneous materials required to complete as specified.',
    { text: 'Includes manufactured stone sills and cap stone as per plans and specifications.', on: false },
    'Includes parging of all exposed foundation as required.',
    'Contractor will coordinate with flashing, framing, and all other trades as needed to deliver a finished product, per plans and specifications.',
  ]),
  t('4200', 'Dampproofing / Waterproofing', 'DAMPPROOFING', [
    'Provide and apply [product] to the foundation insulation, as specified on [plan page and detail].',
  ]),
  t('5100', 'Structural Steel', 'STRUCTURAL STEEL', [
    'Includes provide and installation of structural steel per structural drawings, including;',
    { text: 'Fabricate and install steel stairs per plan, including metal pan treads (concrete by others), picket rail, and handrails.', on: false },
    { text: 'Fabricate and install 42" steel picket guardrail per plan.', on: false },
    { text: 'Fabricate & deliver ([quantity]) 6" Schedule 40 steel pipe bollards – shop primer only, installation by others.', on: false },
    { text: 'Fabricate & deliver ([quantity]) angle embeds with welded stud anchors – shop primer only, installation by others.', on: false },
  ]),
  t('5500', 'Miscellaneous Metals', 'MISCELLANEOUS METALS', [
    { text: 'Provide and deliver ([quantity]) 6" diameter Schedule 40 pipe bollards, galvanized.', on: false },
    { text: 'Furnish and install ([quantity]) roof hatch access ladder, primed, per plans and specifications.', on: false },
    { text: 'Provide and deliver ([quantity]) angles with welded stud anchors, hot-dipped galvanized, as specified in the plans.', on: false },
  ]),
  t('6100', 'Rough Carpentry / Framing', 'ROUGH CARPENTRY', [
    'Includes all layout and installation of interior and exterior wood framing as specified and shown on project documents.',
    'Includes all layout and installation of roof truss system.',
    'Includes installation of all roof and wall sheathing, bracing, and blocking as needed and specified.',
    { text: 'Includes installation of ([quantity]) wood windows and all required accessories (e.g. waterproofing tape, shims).', on: false },
    { text: 'Includes installation of house wrap / ZIP system on exterior walls and all required accessories.', on: false },
    'Includes installation of all associated structural hangers, clips, strapping, and bolts/nuts/washers as specified in the project documents.',
  ]),
  t('7210', 'Building Insulation', 'INSULATION', [
    'Includes provide and installation of all closed cell foam, blow-in, and batt insulation as specified in the plans dated [plan date].',
    'Includes insulation around windows & doors, exterior & interior walls, ceiling areas, baffles & vent chutes as specified in plans and project documents.',
    'Includes air-seal as applicable by building code and specified in plans.',
    'Includes fire blocking/caulking as applicable by building code and specified in plans.',
  ]),
  t('7400', 'Exterior Finish – Roofing, Siding & Trim', 'EXTERIOR FINISH', [
    'All finish work to meet or exceed minimum standards set by drawings and building codes.',
    { text: 'Roof includes but not limited to;', sub: ['Synthetic underlayment, [shingle product] shingles, ridge vent, drip edge, ice & water shield at eaves & valleys.'] },
    { text: 'Soffit/fascia includes but not limited to;', sub: ['Vented soffit at eaves, PVC fascia, and any associated trim/flashing accessories.'] },
    { text: 'Siding includes but not limited to;', sub: ['[siding product] and any associated trim/flashing accessories.'] },
    { text: 'Exterior trim includes but not limited to;', sub: ['Band & frieze boards, window/door trims, mounting blocks, flashings, outside/inside corners, and any associated trim/flashing accessories.'] },
    { text: 'Gutters include but not limited to;', on: false, sub: ['6" K seamless aluminum gutters with 3"x4" downspouts and any associated trim/flashing accessories.'] },
  ]),
  t('7750', 'Gutters & Downspouts', 'GUTTERS & DOWNSPOUTS', [
    'Provide and install [size]" gutters with [size] downspouts, to include all related accessories.',
  ]),
  t('8360', 'Overhead Doors', 'OVERHEAD DOOR', [
    'All overhead door work to meet or exceed minimum standards set by drawings and building codes.',
    'Furnish and install ([quantity]) [size] [door model] overhead doors, including tracks, springs, panels, glazing, and trim as specified.',
    'Furnish and install ([quantity]) [operator model] operators, including photo eyes, safety edge, push-button station, and remotes.',
    'Furnish and install all seals to ensure overhead doors do not leak.',
  ]),
];
