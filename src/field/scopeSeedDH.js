// Trades and scope lines from the Dutchman's Harvest Scopes workbook (2022-17),
// cleaned up: one sentence per line, other jobs' names replaced with {project},
// job-specific details turned into [blanks]. Daily cleanup/schedule/punch lines
// are left out because every scope already ends with them (Closing lines).
// merge: true = the library already has this cost code; these lines are added
// to it as extra (unticked) options instead of a second trade.
export const IMPORT_TAG = 'dutchmans-harvest-2022';

export const DH_TRADES = [
  {
    "costCode": "2521",
    "name": "Concrete Sidewalks",
    "workName": "CONCRETE SIDEWALKS",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, materials, labor and supervision to install sidewalks, dumpster pads and mailbox pad, per plans and specifications for the {project} project.",
        "on": true
      },
      {
        "text": "Includes all sidewalks as shown on Site Plan [plan sheet] for the entire site with subgrades provided by site contractor at minus 8\" +/- 1/2\".",
        "on": true
      },
      {
        "text": "All sidewalks are to be 5' wide with 4\" of reinforced 4500 PSI concrete over 4\" GABC stone.",
        "on": true
      },
      {
        "text": "Includes (6) 10' x 25' x 6\", wire reinforced, 4500 PSI concrete dumpster pads over 6\" of stone base as shown on site plans.",
        "on": true
      },
      {
        "text": "Includes (1) 12' X 25' X 6\", 4500 PSI Concrete Mailbox pad over 6\" of stone base.",
        "on": true
      },
      {
        "text": "Includes separate mobilizations as Project progresses for each Building area or as required for inspections and Project Schedule.",
        "on": true
      },
      {
        "text": "Includes all forms and related materials as well as backfill and compaction of the affected areas made ready for landscaping.",
        "on": true
      },
      {
        "text": "Concrete washout is provided on site and all efforts are to be made to reduce tracking of dirt onto roadways.",
        "on": true
      }
    ]
  },
  {
    "costCode": "2900",
    "name": "Landscaping",
    "workName": "LANDSCAPING",
    "merge": true,
    "items": [
      {
        "text": "Provide all necessary equipment, materials, labor and supervision to design and install all aspects of Landscaping for the {project} project.",
        "on": true
      },
      {
        "text": "Includes all plants, shrubs and trees per landscaping plans [plan sheets] dated [plan date].",
        "on": true
      },
      {
        "text": "Includes plantings, sod and irrigation for all buildings, the Clubhouse and Amenity Areas as well as the parking areas.",
        "on": true
      },
      {
        "text": "Includes the tree buffer line between this property and the adjacent property.",
        "on": true
      },
      {
        "text": "Includes irrigation system per irrigation plans [plan sheets] dated [plan date].",
        "on": true
      },
      {
        "text": "Irrigation System includes all Main and Lateral Lines in PVC Pipe and flexible pipe on rotors and sprays.",
        "on": true
      },
      {
        "text": "Reference proposal #[proposal number].",
        "on": true
      },
      {
        "text": "Includes sleeving for irrigation, as needed under sidewalks and parking lots or other structures as needed.",
        "on": true
      },
      {
        "text": "Includes furnish and install of sod in all areas as required and per aforementioned Landscaping Plans.",
        "on": true
      },
      {
        "text": "Includes separate mobilizations, as needed, per Building or as Schedule and Inspections require.",
        "on": true
      },
      {
        "text": "All efforts are to be made to not track dirt onto roadways.",
        "on": true
      }
    ]
  },
  {
    "costCode": "2521/3010/4010",
    "name": "Concrete & Brick Veneer",
    "workName": "CONCRETE & BRICK VENEER",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to install concrete footings, foundations and slabs, per plans and specifications, for the {project} project.",
        "on": true
      },
      {
        "text": "Includes digging and pouring all footings 12\" X 24\" with 3 rows of #4 rebar continuous and #4 transverse 24\"o/c, per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes form and pour all foundation walls 8 \" thick with #4 verticals at 48\" o/c and #4 12\" o/c horizontally per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes form and pour all foundation walls 8 \" thick with #4 verticals at 48\" o/c at porches, per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes a 4\" brick ledge at footings in all areas receiving brick veneer plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all turndown slabs, 28\"x 12\" with (5) #4 continuous and #4 verticals 24\" o/c per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all turndown slabs to thicken to 20\"x 20\" at corner post per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes digging and pouring all thickened slabs with (3) #4 continuous and #4 transverse 24\" o/c per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes (2) #4 x 4' long corner bars per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes concrete to be 4,000 psi for all interior slabs, foundation walls and footers per plans and Specifications.",
        "on": true
      },
      {
        "text": "Includes concrete to be 4500 psi for all exterior concrete per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes grade and prep building slabs with 4\" stone and 6x6 W1.4xW1.4 WWF per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all concrete building slabs to be 4\" thick per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes Furnish and install 10 mill poly and 2\"polystyrene insulation in all interior concrete slabs.",
        "on": true
      },
      {
        "text": "Includes all sidewalks and lead walks to be 4\" of concrete over 4\" of stone per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all dumpster pads to be 6\" of concrete over 6\" of stone per palns and specifications.",
        "on": true
      },
      {
        "text": "Includes mailbox pads to be 6\"of concrete over 6\" of stone per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all concrete porch slabs to have 6% air entrainment per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes proper backfilling around foundation walls in 12\" lifts and tamping with jumping jack.",
        "on": true
      },
      {
        "text": "Includes any dewatering that maybe required to maintain schedules and keep project moving.",
        "on": true
      },
      {
        "text": "Concrete washout is provided on site and all efforts are to be made to reduce tracking of dirt onto roadways.",
        "on": true
      },
      {
        "text": "Includes all pump truck uses as well as other required equipment as well as all anchor bolts, rebar and other related materials per plans and specifications.",
        "on": true
      },
      {
        "text": "Provide all necessary equipment, material, labor and supervision to install all brick veneer and associated materials per plans and specifications, for the {project} project.",
        "on": true
      },
      {
        "text": "Furnish and install all necessary 4\" CMU below grade for brick ledge.",
        "on": true
      },
      {
        "text": "Furnish and install all full brick veneer per plans.",
        "on": true
      },
      {
        "text": "Furnish and install precast cap on water table per plans.",
        "on": true
      },
      {
        "text": "Furnish and install all necessary flashing.",
        "on": true
      },
      {
        "text": "All brick to be standard size.",
        "on": true
      }
    ]
  },
  {
    "costCode": "4005",
    "name": "Elevator Pit",
    "workName": "ELEVATOR PIT",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to install elevator pit per plans and specifications, for the {project} project.",
        "on": true
      },
      {
        "text": "Furnish and install 6\" block for pit perimeter per plans and specs.",
        "on": true
      },
      {
        "text": "Includes grouting all block cores.",
        "on": true
      },
      {
        "text": "Includes 8\" slab on deck with rebar per plans and specs.",
        "on": true
      },
      {
        "text": "Includes setting all anchor bolts per plans and specs.",
        "on": true
      },
      {
        "text": "All concrete to be 3500 PSI mix.",
        "on": true
      },
      {
        "text": "Includes forming sump pit per plans and specs.",
        "on": true
      }
    ]
  },
  {
    "costCode": "5700",
    "name": "Railings",
    "workName": "RAILINGS",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install all railings, per plans and specifications, for the {project} project.",
        "on": true
      },
      {
        "text": "Includes furnish and install all handrail in ([quantity]) stair towers per plans and specs.",
        "on": true
      },
      {
        "text": "Includes furnish and install all guard rails at unit balconys per plans and specs.",
        "on": true
      },
      {
        "text": "Includes decorative New England Post Caps and trim rings on all vinyl sleeved posts.",
        "on": true
      },
      {
        "text": "Includes all guard rails and hand rails to be installed per code and per plans and specs.",
        "on": true
      }
    ]
  },
  {
    "costCode": "6100",
    "name": "Rough Carpentry",
    "workName": "ROUGH CARPENTRY",
    "merge": true,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to complete all rough carpentry framing per plans and specifications for the {project} project.",
        "on": true
      },
      {
        "text": "Includes crane, generator required for framing, including truss installs.",
        "on": true
      },
      {
        "text": "Furnish and install all nails and similar fasteners to complete scope with lumber, trusses and Simpson type connectors furnished by others.",
        "on": true
      },
      {
        "text": "All floor and roof trusses to be spliced as needed and properly braced, with the use of lifts and/or cranes as needed and included within this scope of work.",
        "on": true
      },
      {
        "text": "All walls to be stick-built from framing lumber provided by others with fasteners within scope.",
        "on": true
      },
      {
        "text": "Install all plywood sheathing on walls, decks, roof areas to include shear walls, separation walls and draft stopping with plywood and clips by others and fasteners within this scope.",
        "on": true
      },
      {
        "text": "Includes all building wrap and tapes.",
        "on": true
      },
      {
        "text": "Install all necessary wood blocking to include double wall blocking for upper cabinets.",
        "on": true
      },
      {
        "text": "Install all joists and substrate at all rear decks with required 1\" slope with Duradek and railings by others.",
        "on": true
      },
      {
        "text": "Install all stair framing, treads, risers and fasteners.",
        "on": true
      },
      {
        "text": "Includes all temporary guard rail systems.",
        "on": true
      },
      {
        "text": "Includes all necessary nailers for balcony soffit.",
        "on": true
      },
      {
        "text": "Install all exterior doors and windows per plans.",
        "on": true
      },
      {
        "text": "All wall studs to be checked for crowning.",
        "on": true
      },
      {
        "text": "Includes notching bottom of all post in areas receiving Duradek.",
        "on": true
      }
    ]
  },
  {
    "costCode": "6200",
    "name": "Finish Carpentry",
    "workName": "FINISH CARPENTRY",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to install all finish carpentry, per plans and specifications for the {project} project.",
        "on": true
      },
      {
        "text": "Responsible for unloading all trim and doors and stocking in the appropriate units, Forklift and operator provided by others.",
        "on": true
      },
      {
        "text": "Sort and install all doors and related trim.",
        "on": true
      },
      {
        "text": "Sort and install all door hardware for interior and exterior doors per plans.",
        "on": true
      },
      {
        "text": "Sort and install all base moldings, casings and shoe moldings.",
        "on": true
      },
      {
        "text": "Sort and install all skirt boards at all stairways.",
        "on": true
      },
      {
        "text": "Sort and install all window sill and stool trim per plans.",
        "on": true
      },
      {
        "text": "All trim is to be glued and field joints are to be filled and sanded.",
        "on": true
      },
      {
        "text": "All work is to be completed by trained, competent and experienced individuals with all doors, trim and moldings installed tightly to wall surfaces and fastened securely.",
        "on": true
      },
      {
        "text": "Doors should be properly installed so they operate as intended and with reasonable ease and are level, plumb, square and properly shimmed and securely fastened.",
        "on": true
      },
      {
        "text": "Interior and Exterior Locks and other related hardware shall be installed after final painting is completed with all locks fitting properly and locking.",
        "on": true
      },
      {
        "text": "Furnish and install all adhesives, glue, nails, screws and other fasteners required to complete this scope of work.",
        "on": true
      },
      {
        "text": "Hardware is furnished by others with construction locks in place on Exterior Doors until directed by Site Superintendent.",
        "on": true
      }
    ]
  },
  {
    "costCode": "6300",
    "name": "Cabinets",
    "workName": "CABINETS",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install all cabinetry, per plans and specifications, for the {project} project.",
        "on": true
      },
      {
        "text": "Responsible for field measuring all Units to insure designed layout will fit in space allowed.",
        "on": true
      },
      {
        "text": "All cabinet layouts, materials, construction, type, species, color and door style are to be approved by Owner and confirmed by subcontractor prior to installation.",
        "on": true
      },
      {
        "text": "Cabinets are to be installed per plan, with necessary spacing / cutouts for ranges, refrigerators, microwaves, sinks, dishwashers, etc…",
        "on": true
      },
      {
        "text": "Cabinets are to be installed per the Manufacturers Installation Instructions and be level, plumb and securely attached.",
        "on": true
      },
      {
        "text": "Includes all cabinetry in Kitchens and Bathrooms per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all necessary labor and supervision to properly unload all cabinetry from trucks and to properly sort to the required Units.",
        "on": true
      },
      {
        "text": "Cabinetry is to be ordered sequentially as required by schedule and delivered in a timely fashion to maintain the Project Schedule.",
        "on": true
      },
      {
        "text": "Includes furnish and install of approved cabinet hardware on all cabinetry in approved locations and quantities.",
        "on": true
      },
      {
        "text": "Includes furnish and install of toekick on all cabinetry and in construction sequence with Flooring as needed.",
        "on": true
      },
      {
        "text": "All cabinet doors and drawers will function properly and be adjusted and properly alligned.",
        "on": true
      },
      {
        "text": "All shelves will be included within cabinets and be properly set, supported and installed.",
        "on": true
      },
      {
        "text": "Includes all necessary modifications to cabinets to allow for plumbing and appliance access as required.",
        "on": true
      },
      {
        "text": "All material finishes to be per finish schedule and look book.",
        "on": true
      }
    ]
  },
  {
    "costCode": "6300",
    "name": "Granite Countertops",
    "workName": "GRANITE COUNTERTOPS",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, granite countertops at the {project} project.",
        "on": true
      },
      {
        "text": "All granite countertop layouts, materials, construction, support and color to be approved by Owner and confirmed by subcontractor prior to installation.",
        "on": true
      },
      {
        "text": "Responsible for template of all Units prior to fabrication and installation to insure proper fit.",
        "on": true
      },
      {
        "text": "Responsible for coordination with Superintendents to maintain Project Schedule by templating, fabricating and installing on time.",
        "on": true
      },
      {
        "text": "Responsible for furnish and install of required steel supports at all bar overhangs to industry standard.",
        "on": true
      },
      {
        "text": "Responsible for supplying A-Frame rack or similar equipment as well as all required labor to deliver granite to individual Units.",
        "on": true
      },
      {
        "text": "Includes 4\" high matching granite backsplash on all kitchen and vanity tops.",
        "on": true
      },
      {
        "text": "Includes furnishing, cut out for and install of large, single bowl, undermount, stainless steel sink in Kitchens.",
        "on": true
      },
      {
        "text": "Includes furnishing, cut out for and install of, single bowl, undermount sink in all bath vanities.",
        "on": true
      },
      {
        "text": "All field seams of countertops to be drawn tight by vacum system, biscuited and epoxied to industry standard.",
        "on": true
      },
      {
        "text": "Includes bracket to properly attach dishwasher to countertop.",
        "on": true
      },
      {
        "text": "All countertop edges to be eased profile and all surfaces properly polished and sealed including stove and refrigerator openings.",
        "on": true
      },
      {
        "text": "All backsplash to have eased edges, be polished and properly caulked and sealed.",
        "on": true
      },
      {
        "text": "Granite characteristics may vary from slab to slab due to being natural material.",
        "on": true
      },
      {
        "text": "Selections to be made from standared granites and quartz.",
        "on": true
      }
    ]
  },
  {
    "costCode": "7110",
    "name": "Waterproofing",
    "workName": "WATERPROOFING",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equiment, material, labor and supervision to install waterproofing sealant on the elevator pits of the {project} project.",
        "on": true
      },
      {
        "text": "Includes spraying waterproofing sealant on all exterior walls of all elevator pits which each measure approximately 8' X 10' X 4' deep per product specifications and recommendations.",
        "on": true
      },
      {
        "text": "Includes a separate mobilization for each Building and as required to keep the intended schedule.",
        "on": true
      },
      {
        "text": "All work to be completed in accordance with any and all applicable National and Local Building Codes.",
        "on": true
      }
    ]
  },
  {
    "costCode": "7210",
    "name": "Building Insulation",
    "workName": "BUILDING INSULATION",
    "merge": true,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to install full scope of Building Insulation, per plans and specifications, to include air seal and fire caulking for the {project} project.",
        "on": true
      },
      {
        "text": "Includes all air seal, draft stopping, baffles and fire caulking in all areas of the building per code.",
        "on": true
      },
      {
        "text": "Includes R-19 insulation in all exterior walls and stairwell walls.",
        "on": true
      },
      {
        "text": "Includes all partition walls to have R-11 insulation on both sides per plans.",
        "on": true
      },
      {
        "text": "Includes R-11 insulation in all interior bathroom walls.",
        "on": true
      },
      {
        "text": "Includes R-49 batts insulation in all 1st floor ceilings.",
        "on": true
      },
      {
        "text": "Includes R-49 blown insulation in all the 2nd floor attic space.",
        "on": true
      },
      {
        "text": "Includes R-38 insulation in all porch attic space.",
        "on": true
      },
      {
        "text": "Includes tenting all sprinkler pipes with R-11 insulation.",
        "on": true
      },
      {
        "text": "Includes R-19 insulation at all rim joist.",
        "on": true
      },
      {
        "text": "Includes all labor required to properly stock the floors with material as the Schedule requires.",
        "on": true
      }
    ]
  },
  {
    "costCode": "7400/7510/7461",
    "name": "Vinyl Siding & Roofing",
    "workName": "VINYL SIDING & ROOFING",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install all vinyl siding and related trim, per plans and specifications, for the {project} project.",
        "on": true
      },
      {
        "text": "Includes all vinyl sidings, per plan, to include standard Double 5\" and triple 4\" ship lap, Board and Batten and cedar impressions per plans and Specifications.",
        "on": true
      },
      {
        "text": "Includes vinyl soffit on all balcony's eave's and porches with vented soffit where indicated.",
        "on": true
      },
      {
        "text": "Includes all fascia wrapped with aluminum coil stock per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes 4\" vinyl lineals at all doors and windows per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all 4\" vinyl corner trim per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all PVC rake trim and band boards around the exterior of the building per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes the faces of all elevated rear decks be wrapped in PVC per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all front & rear porch roof support beams, support columns be wrapped with PVC per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes furnish and install of PVC sheets for all electrical gear and gas service.",
        "on": true
      },
      {
        "text": "All siding and related trim to be installed clean, straight and true with no marks or unreasonable blemishes.",
        "on": true
      },
      {
        "text": "Includes all required fasteners with all materials fastened per manufacturers recommendations to alleviate any sag, ripple, unevenness, out of level, waves, etc.…",
        "on": true
      },
      {
        "text": "Includes all vinyl blocks for lights, receptacles, dryer vents, HVAC vents and hose bibs.",
        "on": true
      },
      {
        "text": "Provide all necessary equipment, material, labor and supervision to install Metal Roof and Asphalt Shingles, per plans and specifications, for the {project} project.",
        "on": true
      },
      {
        "text": "Includes furnish and install all asphalt shingles per plans and manufacturers specifications.",
        "on": true
      },
      {
        "text": "Includes furnish and install all standing seam metal roof per plans and maufacturers specifications.",
        "on": true
      },
      {
        "text": "Includes all underlayment and drip edge.",
        "on": true
      },
      {
        "text": "Includes Ice and Water Shield in all valleys, eaves and roof to wall transitions.",
        "on": true
      },
      {
        "text": "Includes furnish and install drip edge, starter strip, step flashing, ridge roll vent and caps on all hips.",
        "on": true
      },
      {
        "text": "Includes furnish and install of pipe and vent flanges as well as sealing around any roof penetrations as required.",
        "on": true
      },
      {
        "text": "Includes all adhesive, fastners and flashings.",
        "on": true
      }
    ]
  },
  {
    "costCode": "7475",
    "name": "Vinyl Railings",
    "workName": "VINYL RAILINGS",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, the vinyl railings and aluminum handrails at the {project} project.",
        "on": true
      },
      {
        "text": "Includes 4\"x 4\" posts on the balcony's at the rear of all Building be sleeved with a white vinyl sleeve.",
        "on": true
      },
      {
        "text": "Includes furnish and install 42\" tall aluminum guard rails w/2\" top cap and 3/4\" pickets at all balcony's.",
        "on": true
      },
      {
        "text": "Includes decorative Post Caps and trim rings on all posts.",
        "on": true
      },
      {
        "text": "Includes all stairway hand rails (1 side only).",
        "on": true
      },
      {
        "text": "All railings and handrails to be installed per [county] code.",
        "on": true
      },
      {
        "text": "Include all fasteners and miscellaneous material need to complete the installation of all railings and handrails.",
        "on": true
      }
    ]
  },
  {
    "costCode": "7750",
    "name": "Gutters & Downspouts",
    "workName": "GUTTER AND DOWNSPOUTS",
    "merge": true,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install gutter and downspouts, per plans and specifications for the {project} project.",
        "on": true
      },
      {
        "text": "Includes white, 6\", K-style guttering on all Buildings, properly anchored, attached and sloped for proper drainage of all roofing sections on plans.",
        "on": true
      },
      {
        "text": "Includes 3\" X 4\" white, aluminum, downspouts in locations to be determined by others after review of requirements, site conditions and intended outfall areas.",
        "on": true
      },
      {
        "text": "All guttering to include complete and adequate downspout systems carried to the ground with angled end terminations onto included splashblocks at finished grade per plans.",
        "on": true
      },
      {
        "text": "Includes all safety equipment, including lifts and fall protection to safely perform this work per OSHA requirements and as required by the Site Superintendents.",
        "on": true
      }
    ]
  },
  {
    "costCode": "8410/10966",
    "name": "Storefronts & Shower doors",
    "workName": "STOREFRONTS & SHOWER DOORS",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install storefront doors and shower doors per plans and specifications for the {project} project.",
        "on": true
      },
      {
        "text": "Includes ([quantity]) pair(s) of [size] doors and ([quantity]) [size] single doors per plans and specs.",
        "on": true
      },
      {
        "text": "Includes all glass to be 1\" tinted tempered glass with a low E coating.",
        "on": true
      },
      {
        "text": "Includes continuous hinges, closers, concealed vertical rod panic hardware, keyed cylinders, pulls and weather stripping.",
        "on": true
      },
      {
        "text": "Includes all exterior caulking.",
        "on": true
      },
      {
        "text": "Aluminum to be selected from a standard anodized finish.",
        "on": true
      },
      {
        "text": "Includes furnish and install ([quantity]) shower doors with 3/8\" clear tempered glass.",
        "on": true
      },
      {
        "text": "Includes all fastners and sealents to install shower doors.",
        "on": true
      },
      {
        "text": "Includes all hardware finish to be owner approved.",
        "on": true
      }
    ]
  },
  {
    "costCode": "9250",
    "name": "Gypsum Board",
    "workName": "GYPSUM BOARD",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, all gypsum board for the {project} project.",
        "on": true
      },
      {
        "text": "Includes (1) layer of 1/2\" moisture resistant drywall in all bathrooms per plans and specs.",
        "on": true
      },
      {
        "text": "Includes all drywall to be moisture resistant in bathrooms.",
        "on": true
      },
      {
        "text": "Includes all walls to receive (1) layer of 1/2\" drywall per plans and specs.",
        "on": true
      },
      {
        "text": "Includes all unit separation walls to receive 1 layer of 5/8\" type X drywall per plans and specs.",
        "on": true
      },
      {
        "text": "Includes (2) layers of 5/8\" type X drywall on the underside of the stairs leading to the 2nd floor units.",
        "on": true
      },
      {
        "text": "Includes all ceilings to receive (1) layer of 5/8\" type X drywall applied over Hat Channel per plans and specs.",
        "on": true
      },
      {
        "text": "Includes cement board at all tub and shower walls.",
        "on": true
      },
      {
        "text": "Includes drywall returns at all windows per plans and specs.",
        "on": true
      },
      {
        "text": "Includes all exposed drywall to be finished with square metal corner beads and (3) coats of spackle.",
        "on": true
      },
      {
        "text": "Includes all equipment and labor as needed to stock all Units and all floors with all necessary materials.",
        "on": true
      },
      {
        "text": "Includes all fasteners to attach drywall to wood and/or metal framing as needed for glue and screw application of drywall.",
        "on": true
      },
      {
        "text": "Includes all mud, tape, corner beads, sanding materials and anything else required for (3) coats of spackle, sanding, point up and touch up as required.",
        "on": true
      }
    ]
  },
  {
    "costCode": "9250",
    "name": "Cementitious Underlayment",
    "workName": "CEMENTITIOUS UNDERLAYMENT",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, Cementitious Underlayment in all required areas at the {project} project.",
        "on": true
      },
      {
        "text": "Includes approximately 3/4\" thick, 2500 PSI Gyp-Crete Topping applied over 1/8\" sound attenuation evenly over sub floor per plans and specs.",
        "on": true
      },
      {
        "text": "Subfloor and supporting structure are confirmed (By Others) as suitable for installation and swept clean prior to arrival and after drywall has been sanded.",
        "on": true
      },
      {
        "text": "Requires water source at minimum of 60 psi static pressure within 150' of pumping area, proper temperature, building access and trash container (by others).",
        "on": true
      }
    ]
  },
  {
    "costCode": "9681/9688",
    "name": "Flooring",
    "workName": "FLOORING",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install all Floor Coverings, per plans and specifications, for the {project} project.",
        "on": true
      },
      {
        "text": "Includes furnish and install LVP flooring throughout all 1st floor units.",
        "on": true
      },
      {
        "text": "Includes furnish and install LVP flooring in all 2nd floor unit bathrooms, Utility rooms, foyers, kitchens and staircase landings.",
        "on": true
      },
      {
        "text": "Includes furnish and install carpet in all 2nd floor unit bedrooms, living rooms, hallways and closets.",
        "on": true
      },
      {
        "text": "Includes all carpet to be installed over a 6lb moisture pad underlayment.",
        "on": true
      },
      {
        "text": "Includes furnish and install vinyl treads and risers for all stairs.",
        "on": true
      },
      {
        "text": "Includes cleanup of adhesives, general clean of all surfaces, vacuum carpet and protect installed work as appropriate.",
        "on": true
      },
      {
        "text": "Includes all required transitions between varying floor types and at termination points.",
        "on": true
      }
    ]
  },
  {
    "costCode": "9801",
    "name": "Traffic Bearing Deck Coatings",
    "workName": "TRAFFIC BEARING DECK COATINGS",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, Duradek Membrane on balcony's on all buildings at the {project} project.",
        "on": true
      },
      {
        "text": "Includes furnish and install of 60ML \"Duradek\" Traffic Membrane: Duradek Ultra; polyester reinforced PVC membrane with ultra-violet resistance, for fully adhered installation with heat welded seams and perimeter attachment onto approved substrate.",
        "on": true
      },
      {
        "text": "Includes seam placement at the discretion of {company} and normally seams to be run with the slope to help prevent ponding water.",
        "on": true
      },
      {
        "text": "All decks are to be framed and sheathed by others with plywood to be sanded and prepped for installation of Duradek by {company}.",
        "on": true
      },
      {
        "text": "All decks to have outer edges sanded and/or planed to recess aluminum channel to avoid ponding at edges.",
        "on": true
      },
      {
        "text": "Includes the detailing of all related deck posts with said posts in place prior to Duradek installation.",
        "on": true
      },
      {
        "text": "All safety rails must remain in place and all fall protection guidelines must be followed during installation of deck membranes.",
        "on": true
      }
    ]
  },
  {
    "costCode": "9900",
    "name": "Painting",
    "workName": "PAINTING",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, Painting of all required areas and/or items at the {project} project.",
        "on": true
      },
      {
        "text": "Includes covering of all kitchen cabinetry and bath vanities prior to finish coat.",
        "on": true
      },
      {
        "text": "Includes two finish coats of flat paint applied to all walls and ceilings within all rooms of all units by spray and back roll method.",
        "on": true
      },
      {
        "text": "Includes two finish coats of semi gloss paint applied to all trim, doors and frames throughout buildings to include wood skirts at stairways.",
        "on": true
      },
      {
        "text": "Includes caulking and /or puttying of all trim as needed for desired finish as part of prime coat during first mobilization.",
        "on": true
      },
      {
        "text": "Includes all bathroom wall and ceiling paint to have eggshell finish.",
        "on": true
      },
      {
        "text": "Includes point up(By Others) between coats as needed to reach desired finish.",
        "on": true
      },
      {
        "text": "Includes final touch up allowance of ([hours]) hours per Unit for all areas in all Units.",
        "on": true
      },
      {
        "text": "Includes caulking of all tubs, showers, backsplashes and Schluter trim within all Units.",
        "on": true
      }
    ]
  },
  {
    "costCode": "10520/10800",
    "name": "Specialties",
    "workName": "SPECIALTIES",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, all required Fire Extinguishers and Cabinets, Toilet and Bath Accessories and Closet Specialties for the {project} project.",
        "on": true
      },
      {
        "text": "Includes 2 1/2 pound Fire Extinguishers mounted on brackets under each and every Units Kitchen Sink.",
        "on": true
      },
      {
        "text": "Includes furnish and install of the following items in each Units Bathroom : Toilet Tissue holder, Robe Hook, Towel Bar, Medicine Cabinet, Shower Rod or shower enclosure and Vanity Mirror.",
        "on": true
      },
      {
        "text": "Includes furnish and install of ventilated closet shelving (White Wire Shelving) in all closets to include one row in all regular closets and ([quantity]) rows in each Pantry Closet.",
        "on": true
      },
      {
        "text": "All toilet and bath accessories to be in chrome finish and all vanity mirrors to have polished edges.",
        "on": true
      },
      {
        "text": "Includes furnish and install 4\" black house numbers for all units in all buildings.",
        "on": true
      }
    ]
  },
  {
    "costCode": "10956",
    "name": "Exterior Signage",
    "workName": "EXTERIOR SIGNAGE",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment,material, labor and supervision to furnish and install Exterior Signage, per plans and specifications for the {project} project.",
        "on": true
      },
      {
        "text": "Includes (1) 911 Address Sign, approximately 26\" X 30\", on the front gable of each of the Buildings.",
        "on": true
      },
      {
        "text": "Includes Elevator and Sprinkler Mechanical Room Signs in each of the Buildings.",
        "on": true
      },
      {
        "text": "Includes all Floor Level Signs at each of the three floors of each and every Building.",
        "on": true
      },
      {
        "text": "Includes (1) Apartment Unit Sign on each Apartment Door for all Units in all Buildings.",
        "on": true
      },
      {
        "text": "Includes (1) corresponding Unit # sign on each Storage Room Door for all Units in all Buildings.",
        "on": true
      },
      {
        "text": "Includes one mobilization for each Building for installation of all exterior signage for that particular Building.",
        "on": true
      }
    ]
  },
  {
    "costCode": "11470",
    "name": "Kitchen Appliances",
    "workName": "KITCHEN APPLIANCES",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, Kitchen and Laundry Appliances for the {project} project.",
        "on": true
      },
      {
        "text": "Includes [appliance brand] appliances in units as follows:",
        "on": true,
        "sub": [
          "([quantity]) GSS23GSKSS, 23 cu ft Side X Side Refrigerators",
          "([quantity]) JGB660SPSS, Gas Ranges",
          "([quantity]) JNM3163RJSS, Microwave/Hoods",
          "([quantity]) GDF510PSRSS, Built In Dishwashers",
          "([quantity]) GFW550SSNWW, Front Load Washers",
          "([quantity]) GFD55ESSNWW, Front Load Dryers",
          "([quantity]) GFA28KITN, Stacking Kits",
          "([quantity]) Dryer Cords"
        ]
      },
      {
        "text": "Includes all necessary range cords, dryer cords, washer hoses and dryer vent hoses.",
        "on": true
      },
      {
        "text": "Includes all appliances being delivered, uncrated and set into place in specific Units with all cartons removed from job site.",
        "on": true
      },
      {
        "text": "Includes full installation of all refrigerators, ranges, microwaves, washers and dryers.",
        "on": true
      },
      {
        "text": "Includes all microwaves to be installed to recirculate and dishwashers installed by others.",
        "on": true
      },
      {
        "text": "Waterlines for refrigerators with icemakers furnished and installed by others.",
        "on": true
      }
    ]
  },
  {
    "costCode": "14100",
    "name": "Elevators",
    "workName": "ELEVATORS",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material,labor and supervision to fully furnish and install, per plans and specifications, elevators for the {project} project.",
        "on": true
      },
      {
        "text": "Includes furnish and install of ([quantity]) dual two-stage telescopic piston holeless passenger elevator(s) per [elevator company] proposal #[proposal number] dated [proposal date], with its scope and exclusions.",
        "on": true
      }
    ]
  },
  {
    "costCode": "15300",
    "name": "Fire Protection Systems",
    "workName": "FIRE PROTECTION SYSTEMS",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications and all related Building and Fire Codes, an NFPA 13 Fire Sprinkler System for the {project} project.",
        "on": true
      },
      {
        "text": "Includes all components, requirements and exclusions as outlined in the attached {company} proposal dated [proposal date].",
        "on": true
      },
      {
        "text": "Includes the addition of a backflow preventor at each Building and testing as required for each of (7) Buildings.",
        "on": true
      }
    ]
  },
  {
    "costCode": "15400",
    "name": "Plumbing",
    "workName": "PLUMBING",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment,material,labor and supervision to provide Plumbing, per plans and specifications, for the {project} project.",
        "on": true
      },
      {
        "text": "Includes all required Plumbing Permits and Inspections to fully comply with Local, State and National Codes.",
        "on": true
      },
      {
        "text": "Includes excavation, backfill and proper compaction for all required underground work.",
        "on": true
      },
      {
        "text": "Includes furnish and install all drain, vent and water supply lines.",
        "on": true
      },
      {
        "text": "Includes furnish and install all plumbing fixtures and related materials per plans and specsifications.",
        "on": true
      },
      {
        "text": "Includes all gas water heaters per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes incoming Domestic Water, stubbed 5' outside of Building footprint, including 1.5\" Line stubbed from Mechanical Room connected to the site contractors Lateral with Backflow Device, Wye Strainer and Test Report included.",
        "on": true
      },
      {
        "text": "Includes insulation on all cold and hot water lines per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all necessary Kitchen connections to include ice maker and dish washer install.",
        "on": true
      },
      {
        "text": "Included in utility rooms are Washer overflow pans and water heater overflow pans.",
        "on": true
      },
      {
        "text": "Includes incoming Fire Suppression Water, stubbed 5' out of Building footprint including 6\" line stubbed from Mechanical Room and connected to Site Contractor installed lateral with spool piece and flange in Mechanical Room as well as backflow device, wye strainer and test report included.",
        "on": true
      },
      {
        "text": "Includes furnish and install all gas piping to all mechanical equipment as needed.",
        "on": true
      },
      {
        "text": "Includes all required gas piping, using black steel piping, to supply the Water Heaters in each Unit.",
        "on": true
      },
      {
        "text": "Includes all piping, regulator, shut off valve and drip legs from gas meters.",
        "on": true
      },
      {
        "text": "Includes all sewer pipe, fittings and cleanouts per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes furnish and install all dehumidifiers and all associated drain pipe and fittings.",
        "on": true
      },
      {
        "text": "Includes fire caulking of all penetrations made after the initial aplication is completed by the insulator.",
        "on": true
      }
    ]
  },
  {
    "costCode": "15500",
    "name": "HVAC",
    "workName": "HVAC",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, all aspects of HVAC within all buildings at the {project} project.",
        "on": true
      },
      {
        "text": "Includes furnish and complete install of heat pumps and air handlers per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all grills, registers, diffusers and louvers per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes full line sets and all control wiring including all connections.",
        "on": true
      },
      {
        "text": "Includes complete installation of externally insulated Sheetmetal ducting system terminated with flexible ducting to diffusers and grills per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes furnish and install all bath exhaust fans, required duct and fitings to fully vent all fans to the exterior of the buildings per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes furnish and install dryer vent boxes, required duct and fitings to fully vent all dryers to the exterior of the buildings per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all labor and material required for all condensate systems to properly convey to the exterior of the buildings.",
        "on": true
      },
      {
        "text": "Includes system start up and system balancing.",
        "on": true
      },
      {
        "text": "Includes fire caulking of all penetrations.",
        "on": true
      },
      {
        "text": "All intended equipment and materials are to be submitted and are subject to review and approval by Owners, Architect and/or Engineers.",
        "on": true
      }
    ]
  },
  {
    "costCode": "16010",
    "name": "Electrical",
    "workName": "ELECTRICAL",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment, material, labor and supervision to furnish and install, per plans and specifications, a Complete Electrical System including fixtures and all other components at the {project} project.",
        "on": true
      },
      {
        "text": "All work is to be completed by qualified electricians and apprentices and within Local and National Codes.",
        "on": true
      },
      {
        "text": "Includes all required Permits, Licensing, Inspections, Coordination with power company and other entities as needed.",
        "on": true
      },
      {
        "text": "Includes a complete Electrical Service, per the plans and specifications, with Meter and panelboards.",
        "on": true
      },
      {
        "text": "Includes conduit stubed 5' outside of building for the electrical service.",
        "on": true
      },
      {
        "text": "Includes excavation, backfill and proper compaction for all required underground work.",
        "on": true
      },
      {
        "text": "Includes fire caulking of all penetrations made after the initial aplication is completed by the insulator.",
        "on": true
      },
      {
        "text": "Includes Building to be wired per Residential Code Requirements in conjunction with the plans and specifications.",
        "on": true
      },
      {
        "text": "Includes all wiring as detailed to include receptacles, lighting and switching per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes furnish and install of all power wiring, per plans and specifications, for all appliances, sprinkler Requirements, HVAC Equipment and plumbing equipment.",
        "on": true
      },
      {
        "text": "Includes all Equipment Disconnects as required by Code and/or per plans and specifications.",
        "on": true
      },
      {
        "text": "Includes furnish and install all tv wiring, telephone wiring, data wiring per plans and specifications, to include back boxes and media cabinets.",
        "on": true
      },
      {
        "text": "Includes furnish and install all wiring and equipment for door bell system in all units.",
        "on": true
      },
      {
        "text": "Includes furnish and install carbon monoxide detectors at all gas fired water heaters and smoke detectors throughout all units per code.",
        "on": true
      },
      {
        "text": "Includes code compliant considerations for arc fault protection on all outlets in Dining Rooms, Living Rooms, Bedrooms, Closets, Hallways, Laundry Rooms, Kitchens or any similar room.",
        "on": true
      },
      {
        "text": "Includes all required temporary power for the Project to include Office Trailer and 1 location per building once permanent power is connected.",
        "on": true
      },
      {
        "text": "All fixtures to be Owner reviewed for approval prior to ordering.",
        "on": true
      },
      {
        "text": "Fixture allowance to be based on the specifications provided by Whayland during bid.",
        "on": true
      }
    ]
  },
  {
    "costCode": "16140",
    "name": "Fire Alarm System",
    "workName": "FIRE ALARM SYSTEM",
    "merge": false,
    "items": [
      {
        "text": "Provide all necessary equipment,material,labor and supervision to furnish and install a complete Fire Alarm System for the {project} project.",
        "on": true
      },
      {
        "text": "Includes preparation, submittal and approval of a Fire Alarm Plan for all buildings, and inspection of these buildings by the State Fire Marshal and other governing authorities having jurisdiction.",
        "on": true
      },
      {
        "text": "Includes within each Building a separate Fire Alarm Panel that will be networked around the entire complex so as to only incur one monitoring cost.",
        "on": true
      },
      {
        "text": "Includes the use of copper wire throughout and all trenching, conduit, underground cable and trench backfill and tamping to be completed for all buildings.",
        "on": true
      },
      {
        "text": "Included within this scope is the use of low frequency horn strobes for the ([quantity]) ADA Units.",
        "on": true
      },
      {
        "text": "Includes all Electrical Permits as well as Low Voltage Electrical Inspections and fees for all buildings.",
        "on": true
      }
    ]
  }
];
