// ============================================================================
// EHS SMART - COMPREHENSIVE HAZARD REGISTRY
// Multi-Standard Compliance Framework
// ============================================================================
// SOURCES:
// - UK HSE (Health and Safety Executive) - https://www.hse.gov.uk
// - US OSHA (Occupational Safety and Health Administration) - https://www.osha.gov
// - IATA (International Air Transport Association) - https://www.iata.org
// - ICAO (International Civil Aviation Organization)
// - API (American Petroleum Institute)
// - IOGP (International Association of Oil & Gas Producers)
// ============================================================================

const HSE_HAZARD_REGISTRY = {
    version: "2.0.0",
    sources: [
        "UK Health and Safety Executive (HSE)",
        "US OSHA (29 CFR 1910/1926)",
        "IATA Safety Standards",
        "ICAO Annex 19 Safety Management",
        "API Recommended Practices",
        "IOGP Life-Saving Rules"
    ],
    lastUpdated: "2026-01-27",
    
    // ========================================================================
    // HAZARD CATEGORIES (Main Groups)
    // ========================================================================
    hazardCategories: [
        // === HSE UK / OSHA COMMON CATEGORIES ===
        { id: "SLIP", name: "Slips, Trips & Falls", icon: "🚶", color: "#ef4444", standards: ["HSE", "OSHA"] },
        { id: "MANUAL", name: "Manual Handling / Ergonomics", icon: "📦", color: "#f97316", standards: ["HSE", "OSHA"] },
        { id: "HEIGHT", name: "Working at Height", icon: "🪜", color: "#dc2626", standards: ["HSE", "OSHA"] },
        { id: "MACHINE", name: "Machinery & Equipment", icon: "⚙️", color: "#7c3aed", standards: ["HSE", "OSHA"] },
        { id: "ELECTRIC", name: "Electrical Hazards", icon: "⚡", color: "#eab308", standards: ["HSE", "OSHA"] },
        { id: "FIRE", name: "Fire & Explosion", icon: "🔥", color: "#ea580c", standards: ["HSE", "OSHA"] },
        { id: "CHEMICAL", name: "Hazardous Substances (COSHH/HazCom)", icon: "☣️", color: "#16a34a", standards: ["HSE", "OSHA"] },
        { id: "NOISE", name: "Noise Exposure", icon: "🔊", color: "#0ea5e9", standards: ["HSE", "OSHA"] },
        { id: "VIBRATION", name: "Vibration", icon: "📳", color: "#8b5cf6", standards: ["HSE", "OSHA"] },
        { id: "RADIATION", name: "Radiation (Ionizing & Non-Ionizing)", icon: "☢️", color: "#f59e0b", standards: ["HSE", "OSHA"] },
        { id: "CONFINED", name: "Confined Spaces / Permit Required", icon: "🚧", color: "#64748b", standards: ["HSE", "OSHA"] },
        { id: "TRANSPORT", name: "Workplace Transport / PIV", icon: "🚛", color: "#3b82f6", standards: ["HSE", "OSHA"] },
        { id: "DSE", name: "Display Screen Equipment / VDT", icon: "🖥️", color: "#06b6d4", standards: ["HSE", "OSHA"] },
        { id: "STRESS", name: "Work-Related Stress / Psychosocial", icon: "🧠", color: "#ec4899", standards: ["HSE", "OSHA"] },
        { id: "BIOLOGICAL", name: "Biological Hazards / Bloodborne", icon: "🦠", color: "#22c55e", standards: ["HSE", "OSHA"] },
        { id: "ASBESTOS", name: "Asbestos", icon: "🏗️", color: "#78716c", standards: ["HSE", "OSHA"] },
        { id: "PRESSURE", name: "Pressure Systems", icon: "💨", color: "#6366f1", standards: ["HSE", "OSHA"] },
        { id: "PPE", name: "PPE Failures", icon: "🦺", color: "#f43f5e", standards: ["HSE", "OSHA"] },
        { id: "ENVIRONMENT", name: "Environmental Conditions", icon: "🌡️", color: "#14b8a6", standards: ["HSE", "OSHA"] },
        { id: "ERGONOMIC", name: "Ergonomic Hazards", icon: "🪑", color: "#a855f7", standards: ["HSE", "OSHA"] },
        
        // === OSHA-SPECIFIC CATEGORIES ===
        { id: "LOCKOUT", name: "Lockout/Tagout (LOTO)", icon: "🔒", color: "#dc2626", standards: ["OSHA"] },
        { id: "EXCAVATION", name: "Excavation & Trenching", icon: "🕳️", color: "#92400e", standards: ["OSHA"] },
        { id: "SCAFFOLD", name: "Scaffolding", icon: "🏗️", color: "#b45309", standards: ["OSHA"] },
        { id: "CRANE", name: "Cranes & Rigging", icon: "🏗️", color: "#0369a1", standards: ["OSHA"] },
        { id: "WELDING", name: "Welding, Cutting & Brazing", icon: "🔧", color: "#c2410c", standards: ["OSHA"] },
        { id: "RESPIRE", name: "Respiratory Protection", icon: "😷", color: "#0891b2", standards: ["OSHA"] },
        { id: "HAZWASTE", name: "Hazardous Waste Operations (HAZWOPER)", icon: "☢️", color: "#65a30d", standards: ["OSHA"] },
        { id: "PROCESS", name: "Process Safety Management (PSM)", icon: "🏭", color: "#7c3aed", standards: ["OSHA"] },
        
        // === AVIATION / IATA / ICAO CATEGORIES ===
        { id: "AIRCRAFT", name: "Aircraft Operations", icon: "✈️", color: "#0284c7", standards: ["IATA", "ICAO"] },
        { id: "RAMP", name: "Ramp / Ground Operations", icon: "🛫", color: "#0369a1", standards: ["IATA", "ICAO"] },
        { id: "JETBLAST", name: "Jet Blast & Propeller Wash", icon: "💨", color: "#dc2626", standards: ["IATA", "ICAO"] },
        { id: "FUELING", name: "Aircraft Fueling", icon: "⛽", color: "#ea580c", standards: ["IATA", "ICAO"] },
        { id: "CARGO", name: "Cargo & ULD Handling", icon: "📦", color: "#0891b2", standards: ["IATA", "ICAO"] },
        { id: "DEICER", name: "De-icing / Anti-icing", icon: "❄️", color: "#06b6d4", standards: ["IATA", "ICAO"] },
        { id: "FOD", name: "Foreign Object Debris (FOD)", icon: "⚠️", color: "#f59e0b", standards: ["IATA", "ICAO"] },
        { id: "DGOOD", name: "Dangerous Goods (DG)", icon: "☣️", color: "#dc2626", standards: ["IATA", "ICAO"] },
        { id: "CABIN", name: "Cabin Safety", icon: "💺", color: "#8b5cf6", standards: ["IATA", "ICAO"] },
        { id: "BIRD", name: "Bird & Wildlife Strikes", icon: "🦅", color: "#84cc16", standards: ["IATA", "ICAO"] },
        
        // === OIL & GAS / API / IOGP CATEGORIES ===
        { id: "DRILLING", name: "Drilling Operations", icon: "🛢️", color: "#78716c", standards: ["API", "IOGP"] },
        { id: "H2S", name: "Hydrogen Sulfide (H2S)", icon: "💀", color: "#dc2626", standards: ["API", "IOGP"] },
        { id: "BLOWOUT", name: "Well Control / Blowout Prevention", icon: "🌋", color: "#b91c1c", standards: ["API", "IOGP"] },
        { id: "PIPELINE", name: "Pipeline Operations", icon: "🔧", color: "#4338ca", standards: ["API", "IOGP"] },
        { id: "OFFSHORE", name: "Offshore Operations", icon: "🚢", color: "#0284c7", standards: ["API", "IOGP"] },
        { id: "HYDROCARB", name: "Hydrocarbon Release", icon: "💧", color: "#78716c", standards: ["API", "IOGP"] },
        { id: "LIFTING", name: "Lifting Operations", icon: "🏗️", color: "#ca8a04", standards: ["API", "IOGP"] },
        { id: "DIVING", name: "Commercial Diving", icon: "🤿", color: "#0891b2", standards: ["API", "IOGP"] },
        { id: "HOTWORK", name: "Hot Work Operations", icon: "🔥", color: "#ea580c", standards: ["API", "IOGP"] },
        { id: "SIMOPS", name: "Simultaneous Operations (SIMOPS)", icon: "⚠️", color: "#7c3aed", standards: ["API", "IOGP"] }
    ],

    // ========================================================================
    // SPECIFIC HAZARDS BY CATEGORY
    // ========================================================================
    hazards: {
        // --------------------------------------------------------------------
        // SLIPS, TRIPS & FALLS
        // --------------------------------------------------------------------
        SLIP: [
            { id: "SLIP001", name: "Wet or slippery floors", severity: "Medium" },
            { id: "SLIP002", name: "Uneven floor surfaces", severity: "Medium" },
            { id: "SLIP003", name: "Trailing cables", severity: "Medium" },
            { id: "SLIP004", name: "Loose mats or rugs", severity: "Low" },
            { id: "SLIP005", name: "Poor lighting in walkways", severity: "Medium" },
            { id: "SLIP006", name: "Cluttered walkways/aisles", severity: "Medium" },
            { id: "SLIP007", name: "Unmarked changes in floor level", severity: "High" },
            { id: "SLIP008", name: "Icy or snow-covered surfaces", severity: "High" },
            { id: "SLIP009", name: "Oil or grease spillage", severity: "High" },
            { id: "SLIP010", name: "Damaged flooring/potholes", severity: "Medium" },
            { id: "SLIP011", name: "Inadequate handrails on stairs", severity: "Medium" },
            { id: "SLIP012", name: "Worn stair treads", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // MANUAL HANDLING
        // --------------------------------------------------------------------
        MANUAL: [
            { id: "MAN001", name: "Lifting heavy loads", severity: "High" },
            { id: "MAN002", name: "Repetitive lifting", severity: "Medium" },
            { id: "MAN003", name: "Awkward postures during handling", severity: "Medium" },
            { id: "MAN004", name: "Twisting while carrying loads", severity: "High" },
            { id: "MAN005", name: "Pushing/pulling heavy objects", severity: "Medium" },
            { id: "MAN006", name: "Carrying loads over long distances", severity: "Medium" },
            { id: "MAN007", name: "Handling loads with poor grip", severity: "Medium" },
            { id: "MAN008", name: "Handling unstable loads", severity: "High" },
            { id: "MAN009", name: "Lifting above shoulder height", severity: "High" },
            { id: "MAN010", name: "Handling in confined spaces", severity: "High" },
            { id: "MAN011", name: "Team lifting without coordination", severity: "Medium" },
            { id: "MAN012", name: "Insufficient rest breaks", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // WORKING AT HEIGHT
        // --------------------------------------------------------------------
        HEIGHT: [
            { id: "HGT001", name: "Falls from ladders", severity: "Critical" },
            { id: "HGT002", name: "Falls from scaffolding", severity: "Critical" },
            { id: "HGT003", name: "Falls through fragile surfaces", severity: "Critical" },
            { id: "HGT004", name: "Falls from roofs", severity: "Critical" },
            { id: "HGT005", name: "Falls from MEWPs/cherry pickers", severity: "Critical" },
            { id: "HGT006", name: "Falling objects from height", severity: "High" },
            { id: "HGT007", name: "Unprotected edges/openings", severity: "Critical" },
            { id: "HGT008", name: "Overreaching while at height", severity: "High" },
            { id: "HGT009", name: "Inadequate access equipment", severity: "High" },
            { id: "HGT010", name: "Unstable working platform", severity: "Critical" },
            { id: "HGT011", name: "Weather conditions affecting work at height", severity: "High" },
            { id: "HGT012", name: "Inadequate edge protection", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // MACHINERY & EQUIPMENT
        // --------------------------------------------------------------------
        MACHINE: [
            { id: "MCH001", name: "Contact with moving parts", severity: "Critical" },
            { id: "MCH002", name: "Entanglement in machinery", severity: "Critical" },
            { id: "MCH003", name: "Crushing by machinery", severity: "Critical" },
            { id: "MCH004", name: "Ejection of materials", severity: "High" },
            { id: "MCH005", name: "Hot surfaces", severity: "Medium" },
            { id: "MCH006", name: "Sharp edges/cutting points", severity: "High" },
            { id: "MCH007", name: "Inadequate machine guarding", severity: "Critical" },
            { id: "MCH008", name: "Unexpected startup", severity: "Critical" },
            { id: "MCH009", name: "Failure to isolate (LOTO)", severity: "Critical" },
            { id: "MCH010", name: "Defective equipment", severity: "High" },
            { id: "MCH011", name: "Improper use of tools", severity: "Medium" },
            { id: "MCH012", name: "Flying debris/particles", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // ELECTRICAL HAZARDS
        // --------------------------------------------------------------------
        ELECTRIC: [
            { id: "ELC001", name: "Contact with live parts", severity: "Critical" },
            { id: "ELC002", name: "Electrical burns", severity: "Critical" },
            { id: "ELC003", name: "Electrical shock", severity: "Critical" },
            { id: "ELC004", name: "Arcing/flash over", severity: "Critical" },
            { id: "ELC005", name: "Damaged cables/wiring", severity: "High" },
            { id: "ELC006", name: "Overloaded circuits", severity: "High" },
            { id: "ELC007", name: "Wet conditions near electrics", severity: "Critical" },
            { id: "ELC008", name: "Inadequate isolation procedures", severity: "Critical" },
            { id: "ELC009", name: "Faulty portable appliances", severity: "Medium" },
            { id: "ELC010", name: "Underground/overhead cables", severity: "Critical" },
            { id: "ELC011", name: "Static electricity discharge", severity: "Medium" },
            { id: "ELC012", name: "Lightning strikes", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // FIRE & EXPLOSION
        // --------------------------------------------------------------------
        FIRE: [
            { id: "FIR001", name: "Flammable materials storage", severity: "High" },
            { id: "FIR002", name: "Ignition sources near flammables", severity: "Critical" },
            { id: "FIR003", name: "Explosive atmospheres (ATEX)", severity: "Critical" },
            { id: "FIR004", name: "Hot work (welding, cutting)", severity: "High" },
            { id: "FIR005", name: "Electrical fires", severity: "High" },
            { id: "FIR006", name: "Blocked fire exits", severity: "Critical" },
            { id: "FIR007", name: "Inadequate fire detection", severity: "High" },
            { id: "FIR008", name: "Lack of firefighting equipment", severity: "High" },
            { id: "FIR009", name: "Poor housekeeping (combustibles)", severity: "Medium" },
            { id: "FIR010", name: "Gas leaks", severity: "Critical" },
            { id: "FIR011", name: "Dust explosion risk", severity: "Critical" },
            { id: "FIR012", name: "Smoking in restricted areas", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // HAZARDOUS SUBSTANCES (COSHH)
        // --------------------------------------------------------------------
        CHEMICAL: [
            { id: "CHM001", name: "Inhalation of toxic fumes", severity: "Critical" },
            { id: "CHM002", name: "Skin contact with chemicals", severity: "High" },
            { id: "CHM003", name: "Eye contact with chemicals", severity: "High" },
            { id: "CHM004", name: "Ingestion of hazardous substances", severity: "Critical" },
            { id: "CHM005", name: "Chemical burns", severity: "High" },
            { id: "CHM006", name: "Long-term health effects (carcinogens)", severity: "Critical" },
            { id: "CHM007", name: "Allergic reactions/sensitizers", severity: "Medium" },
            { id: "CHM008", name: "Asphyxiation (oxygen depletion)", severity: "Critical" },
            { id: "CHM009", name: "Chemical spills", severity: "High" },
            { id: "CHM010", name: "Incompatible chemical mixing", severity: "Critical" },
            { id: "CHM011", name: "Inadequate ventilation", severity: "High" },
            { id: "CHM012", name: "Missing/unclear SDS information", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // NOISE EXPOSURE
        // --------------------------------------------------------------------
        NOISE: [
            { id: "NOI001", name: "Continuous high noise levels (>85dB)", severity: "High" },
            { id: "NOI002", name: "Impact/impulse noise", severity: "High" },
            { id: "NOI003", name: "Long-term hearing damage (NIHL)", severity: "High" },
            { id: "NOI004", name: "Tinnitus risk", severity: "Medium" },
            { id: "NOI005", name: "Inability to hear warnings", severity: "High" },
            { id: "NOI006", name: "Communication difficulties", severity: "Medium" },
            { id: "NOI007", name: "Inadequate hearing protection", severity: "High" },
            { id: "NOI008", name: "Noise from machinery", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // VIBRATION
        // --------------------------------------------------------------------
        VIBRATION: [
            { id: "VIB001", name: "Hand-arm vibration (HAVS)", severity: "High" },
            { id: "VIB002", name: "Whole-body vibration", severity: "Medium" },
            { id: "VIB003", name: "Power tool vibration exposure", severity: "High" },
            { id: "VIB004", name: "Vehicle vibration (long-term)", severity: "Medium" },
            { id: "VIB005", name: "White finger syndrome risk", severity: "High" },
            { id: "VIB006", name: "Carpal tunnel syndrome risk", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // RADIATION
        // --------------------------------------------------------------------
        RADIATION: [
            { id: "RAD001", name: "Ionizing radiation exposure", severity: "Critical" },
            { id: "RAD002", name: "Non-ionizing radiation (UV, lasers)", severity: "High" },
            { id: "RAD003", name: "Welding arc radiation", severity: "High" },
            { id: "RAD004", name: "X-ray equipment", severity: "Critical" },
            { id: "RAD005", name: "Radioactive materials", severity: "Critical" },
            { id: "RAD006", name: "Solar radiation (outdoor work)", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // CONFINED SPACES
        // --------------------------------------------------------------------
        CONFINED: [
            { id: "CON001", name: "Oxygen deficiency", severity: "Critical" },
            { id: "CON002", name: "Toxic atmosphere buildup", severity: "Critical" },
            { id: "CON003", name: "Flammable atmosphere", severity: "Critical" },
            { id: "CON004", name: "Engulfment by materials", severity: "Critical" },
            { id: "CON005", name: "Difficulty of rescue", severity: "High" },
            { id: "CON006", name: "Limited entry/exit points", severity: "High" },
            { id: "CON007", name: "Temperature extremes", severity: "High" },
            { id: "CON008", name: "Inadequate ventilation", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // WORKPLACE TRANSPORT
        // --------------------------------------------------------------------
        TRANSPORT: [
            { id: "TRN001", name: "Forklift truck incidents", severity: "Critical" },
            { id: "TRN002", name: "Pedestrian struck by vehicle", severity: "Critical" },
            { id: "TRN003", name: "Vehicle overturning", severity: "Critical" },
            { id: "TRN004", name: "Loading/unloading incidents", severity: "High" },
            { id: "TRN005", name: "Reversing vehicles", severity: "High" },
            { id: "TRN006", name: "Coupling/uncoupling trailers", severity: "High" },
            { id: "TRN007", name: "Inadequate traffic management", severity: "High" },
            { id: "TRN008", name: "Poor visibility/blind spots", severity: "High" },
            { id: "TRN009", name: "Unsecured loads", severity: "High" },
            { id: "TRN010", name: "Driving at work (road traffic)", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // DISPLAY SCREEN EQUIPMENT (DSE)
        // --------------------------------------------------------------------
        DSE: [
            { id: "DSE001", name: "Eye strain/fatigue", severity: "Low" },
            { id: "DSE002", name: "Musculoskeletal disorders (MSD)", severity: "Medium" },
            { id: "DSE003", name: "Poor workstation setup", severity: "Medium" },
            { id: "DSE004", name: "Prolonged static posture", severity: "Medium" },
            { id: "DSE005", name: "Inadequate lighting/glare", severity: "Low" },
            { id: "DSE006", name: "Repetitive strain injury (RSI)", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // WORK-RELATED STRESS
        // --------------------------------------------------------------------
        STRESS: [
            { id: "STR001", name: "Excessive workload", severity: "High" },
            { id: "STR002", name: "Lack of control over work", severity: "Medium" },
            { id: "STR003", name: "Poor management support", severity: "Medium" },
            { id: "STR004", name: "Workplace bullying/harassment", severity: "High" },
            { id: "STR005", name: "Job insecurity", severity: "Medium" },
            { id: "STR006", name: "Work-life imbalance", severity: "Medium" },
            { id: "STR007", name: "Violence and aggression", severity: "High" },
            { id: "STR008", name: "Lone working stress", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // BIOLOGICAL HAZARDS
        // --------------------------------------------------------------------
        BIOLOGICAL: [
            { id: "BIO001", name: "Blood-borne pathogens", severity: "Critical" },
            { id: "BIO002", name: "Airborne infections", severity: "High" },
            { id: "BIO003", name: "Legionella (water systems)", severity: "High" },
            { id: "BIO004", name: "Animal-related diseases", severity: "Medium" },
            { id: "BIO005", name: "Mould/fungi exposure", severity: "Medium" },
            { id: "BIO006", name: "Needle stick injuries", severity: "Critical" },
            { id: "BIO007", name: "Contaminated waste handling", severity: "High" },
            { id: "BIO008", name: "Food contamination", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // ASBESTOS
        // --------------------------------------------------------------------
        ASBESTOS: [
            { id: "ASB001", name: "Asbestos fiber inhalation", severity: "Critical" },
            { id: "ASB002", name: "Disturbing asbestos materials", severity: "Critical" },
            { id: "ASB003", name: "Unknown asbestos presence", severity: "High" },
            { id: "ASB004", name: "Mesothelioma risk", severity: "Critical" },
            { id: "ASB005", name: "Asbestosis risk", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // PRESSURE SYSTEMS
        // --------------------------------------------------------------------
        PRESSURE: [
            { id: "PRS001", name: "Vessel rupture/explosion", severity: "Critical" },
            { id: "PRS002", name: "Compressed gas cylinder hazards", severity: "High" },
            { id: "PRS003", name: "Steam release", severity: "High" },
            { id: "PRS004", name: "Hydraulic system failure", severity: "High" },
            { id: "PRS005", name: "Pneumatic system failure", severity: "High" },
            { id: "PRS006", name: "Overpressurization", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // PPE FAILURES
        // --------------------------------------------------------------------
        PPE: [
            { id: "PPE001", name: "Incorrect PPE selection", severity: "High" },
            { id: "PPE002", name: "Damaged/worn PPE", severity: "High" },
            { id: "PPE003", name: "Poor PPE fit", severity: "Medium" },
            { id: "PPE004", name: "Failure to wear PPE", severity: "High" },
            { id: "PPE005", name: "PPE creating additional hazards", severity: "Medium" },
            { id: "PPE006", name: "Inadequate PPE training", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // ENVIRONMENTAL CONDITIONS
        // --------------------------------------------------------------------
        ENVIRONMENT: [
            { id: "ENV001", name: "Extreme heat exposure", severity: "High" },
            { id: "ENV002", name: "Extreme cold exposure", severity: "High" },
            { id: "ENV003", name: "Poor lighting conditions", severity: "Medium" },
            { id: "ENV004", name: "Adverse weather conditions", severity: "Medium" },
            { id: "ENV005", name: "Poor air quality", severity: "Medium" },
            { id: "ENV006", name: "Humidity extremes", severity: "Low" }
        ],

        // --------------------------------------------------------------------
        // ERGONOMIC HAZARDS
        // --------------------------------------------------------------------
        ERGONOMIC: [
            { id: "ERG001", name: "Repetitive motions", severity: "Medium" },
            { id: "ERG002", name: "Awkward body positions", severity: "Medium" },
            { id: "ERG003", name: "Forceful exertions", severity: "High" },
            { id: "ERG004", name: "Contact stress (pressure points)", severity: "Medium" },
            { id: "ERG005", name: "Prolonged standing", severity: "Medium" },
            { id: "ERG006", name: "Prolonged sitting", severity: "Medium" }
        ],

        // ====================================================================
        // OSHA-SPECIFIC HAZARDS (29 CFR 1910/1926)
        // ====================================================================

        // --------------------------------------------------------------------
        // LOCKOUT/TAGOUT (LOTO) - OSHA 1910.147
        // --------------------------------------------------------------------
        LOCKOUT: [
            { id: "LOTO001", name: "Unexpected machine startup", severity: "Critical" },
            { id: "LOTO002", name: "Failure to de-energize equipment", severity: "Critical" },
            { id: "LOTO003", name: "Inadequate lockout devices", severity: "High" },
            { id: "LOTO004", name: "Removal of locks without authorization", severity: "Critical" },
            { id: "LOTO005", name: "Multiple energy sources not isolated", severity: "Critical" },
            { id: "LOTO006", name: "Stored/residual energy release", severity: "Critical" },
            { id: "LOTO007", name: "Improper group lockout procedures", severity: "High" },
            { id: "LOTO008", name: "Lack of LOTO training", severity: "High" },
            { id: "LOTO009", name: "Shift change without proper lockout transfer", severity: "High" },
            { id: "LOTO010", name: "Contractor LOTO coordination failures", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // EXCAVATION & TRENCHING - OSHA 1926 Subpart P
        // --------------------------------------------------------------------
        EXCAVATION: [
            { id: "EXC001", name: "Trench collapse/cave-in", severity: "Critical" },
            { id: "EXC002", name: "Falls into excavations", severity: "High" },
            { id: "EXC003", name: "Struck by falling materials", severity: "High" },
            { id: "EXC004", name: "Contact with underground utilities", severity: "Critical" },
            { id: "EXC005", name: "Hazardous atmosphere in excavation", severity: "Critical" },
            { id: "EXC006", name: "Water accumulation/flooding", severity: "High" },
            { id: "EXC007", name: "Inadequate protective systems", severity: "Critical" },
            { id: "EXC008", name: "Mobile equipment near excavation edge", severity: "High" },
            { id: "EXC009", name: "Insufficient means of egress", severity: "High" },
            { id: "EXC010", name: "Spoil pile too close to edge", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // SCAFFOLDING - OSHA 1926 Subpart L
        // --------------------------------------------------------------------
        SCAFFOLD: [
            { id: "SCF001", name: "Scaffold collapse", severity: "Critical" },
            { id: "SCF002", name: "Falls from scaffold platforms", severity: "Critical" },
            { id: "SCF003", name: "Inadequate guardrails/toeboards", severity: "High" },
            { id: "SCF004", name: "Scaffold overloading", severity: "Critical" },
            { id: "SCF005", name: "Improper scaffold erection", severity: "Critical" },
            { id: "SCF006", name: "Unstable scaffold foundation", severity: "Critical" },
            { id: "SCF007", name: "Scaffold struck by vehicles", severity: "High" },
            { id: "SCF008", name: "Electrocution from overhead lines", severity: "Critical" },
            { id: "SCF009", name: "Falling objects from scaffold", severity: "High" },
            { id: "SCF010", name: "Defective scaffold components", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // CRANES & RIGGING - OSHA 1926 Subpart CC
        // --------------------------------------------------------------------
        CRANE: [
            { id: "CRN001", name: "Crane tip-over", severity: "Critical" },
            { id: "CRN002", name: "Dropped/falling loads", severity: "Critical" },
            { id: "CRN003", name: "Boom/crane contact with power lines", severity: "Critical" },
            { id: "CRN004", name: "Rigging failure", severity: "Critical" },
            { id: "CRN005", name: "Overloading crane capacity", severity: "Critical" },
            { id: "CRN006", name: "Swing radius struck-by", severity: "Critical" },
            { id: "CRN007", name: "Two-blocking", severity: "Critical" },
            { id: "CRN008", name: "Uncontrolled load swing", severity: "High" },
            { id: "CRN009", name: "Outrigger/ground failure", severity: "Critical" },
            { id: "CRN010", name: "Improper load securing", severity: "High" },
            { id: "CRN011", name: "Signal person communication failure", severity: "High" },
            { id: "CRN012", name: "Mechanical/structural crane failure", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // WELDING, CUTTING & BRAZING - OSHA 1910.252
        // --------------------------------------------------------------------
        WELDING: [
            { id: "WLD001", name: "Welding fume inhalation", severity: "High" },
            { id: "WLD002", name: "Arc eye/flash burn", severity: "High" },
            { id: "WLD003", name: "Burns from hot metal/sparks", severity: "High" },
            { id: "WLD004", name: "Fire from welding sparks", severity: "Critical" },
            { id: "WLD005", name: "Explosion in confined areas", severity: "Critical" },
            { id: "WLD006", name: "Electric shock from welding equipment", severity: "Critical" },
            { id: "WLD007", name: "Compressed gas cylinder hazards", severity: "High" },
            { id: "WLD008", name: "UV/IR radiation exposure", severity: "Medium" },
            { id: "WLD009", name: "Toxic coating fumes (galvanized, painted)", severity: "High" },
            { id: "WLD010", name: "Oxygen enriched atmosphere fire", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // RESPIRATORY PROTECTION - OSHA 1910.134
        // --------------------------------------------------------------------
        RESPIRE: [
            { id: "RSP001", name: "Incorrect respirator selection", severity: "Critical" },
            { id: "RSP002", name: "Poor respirator fit", severity: "High" },
            { id: "RSP003", name: "IDLH atmosphere without proper SCBA", severity: "Critical" },
            { id: "RSP004", name: "Contaminated breathing air supply", severity: "Critical" },
            { id: "RSP005", name: "Respirator cartridge breakthrough", severity: "High" },
            { id: "RSP006", name: "Oxygen deficient atmosphere", severity: "Critical" },
            { id: "RSP007", name: "Medical conditions affecting respirator use", severity: "Medium" },
            { id: "RSP008", name: "Lack of fit testing", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // HAZWOPER - OSHA 1910.120
        // --------------------------------------------------------------------
        HAZWASTE: [
            { id: "HAZ001", name: "Unknown chemical exposure", severity: "Critical" },
            { id: "HAZ002", name: "Contaminated site entry without proper PPE", severity: "Critical" },
            { id: "HAZ003", name: "Decontamination failure", severity: "High" },
            { id: "HAZ004", name: "Drum/container rupture", severity: "High" },
            { id: "HAZ005", name: "Incompatible waste mixing", severity: "Critical" },
            { id: "HAZ006", name: "Emergency response without training", severity: "Critical" },
            { id: "HAZ007", name: "Heat stress in protective equipment", severity: "High" },
            { id: "HAZ008", name: "Secondary contamination spread", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // PROCESS SAFETY MANAGEMENT (PSM) - OSHA 1910.119
        // --------------------------------------------------------------------
        PROCESS: [
            { id: "PSM001", name: "Process deviation/upset", severity: "Critical" },
            { id: "PSM002", name: "Mechanical integrity failure", severity: "Critical" },
            { id: "PSM003", name: "Management of change (MOC) bypass", severity: "Critical" },
            { id: "PSM004", name: "Operating procedure deviation", severity: "High" },
            { id: "PSM005", name: "Safety instrumented system failure", severity: "Critical" },
            { id: "PSM006", name: "Pre-startup safety review missed", severity: "High" },
            { id: "PSM007", name: "Contractor safety interface failures", severity: "High" },
            { id: "PSM008", name: "Emergency response inadequate", severity: "Critical" }
        ],

        // ====================================================================
        // AVIATION / IATA / ICAO HAZARDS
        // ====================================================================

        // --------------------------------------------------------------------
        // AIRCRAFT OPERATIONS - IATA ISAGO
        // --------------------------------------------------------------------
        AIRCRAFT: [
            { id: "AIR001", name: "Aircraft ground damage (hangar rash)", severity: "High" },
            { id: "AIR002", name: "Jet engine ingestion", severity: "Critical" },
            { id: "AIR003", name: "Propeller strike", severity: "Critical" },
            { id: "AIR004", name: "Aircraft door operation injuries", severity: "High" },
            { id: "AIR005", name: "Wing/tail strike during towing", severity: "High" },
            { id: "AIR006", name: "Pushback/towing incidents", severity: "High" },
            { id: "AIR007", name: "Collision with ground equipment", severity: "High" },
            { id: "AIR008", name: "Incorrect aircraft configuration", severity: "Critical" },
            { id: "AIR009", name: "Hydraulic system hazards", severity: "High" },
            { id: "AIR010", name: "APU exhaust exposure", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // RAMP / GROUND OPERATIONS - IATA IGOM
        // --------------------------------------------------------------------
        RAMP: [
            { id: "RMP001", name: "Struck by ground support equipment", severity: "Critical" },
            { id: "RMP002", name: "GSE collision with aircraft", severity: "High" },
            { id: "RMP003", name: "Baggage/cargo handling injuries", severity: "Medium" },
            { id: "RMP004", name: "Falls from aircraft holds/doors", severity: "High" },
            { id: "RMP005", name: "Passenger boarding bridge incidents", severity: "High" },
            { id: "RMP006", name: "Catering vehicle incidents", severity: "Medium" },
            { id: "RMP007", name: "Belt loader entanglement", severity: "High" },
            { id: "RMP008", name: "Night operations visibility", severity: "Medium" },
            { id: "RMP009", name: "Adverse weather on ramp", severity: "Medium" },
            { id: "RMP010", name: "Runway/taxiway incursion", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // JET BLAST & PROPELLER WASH
        // --------------------------------------------------------------------
        JETBLAST: [
            { id: "JET001", name: "Personnel blown over by jet blast", severity: "Critical" },
            { id: "JET002", name: "Equipment blown into personnel/aircraft", severity: "Critical" },
            { id: "JET003", name: "Debris propelled by jet exhaust", severity: "High" },
            { id: "JET004", name: "Propeller wash knockdown", severity: "High" },
            { id: "JET005", name: "Hearing damage from jet noise", severity: "High" },
            { id: "JET006", name: "Thermal injuries from exhaust", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // AIRCRAFT FUELING - IATA/JIG Standards
        // --------------------------------------------------------------------
        FUELING: [
            { id: "FUL001", name: "Fuel spill/overfill", severity: "High" },
            { id: "FUL002", name: "Static electricity ignition", severity: "Critical" },
            { id: "FUL003", name: "Fuel vapor inhalation", severity: "High" },
            { id: "FUL004", name: "Fuel fire/explosion", severity: "Critical" },
            { id: "FUL005", name: "Fuel contamination", severity: "High" },
            { id: "FUL006", name: "Fuel tanker collision", severity: "High" },
            { id: "FUL007", name: "Bonding/grounding failure", severity: "Critical" },
            { id: "FUL008", name: "Deadman control failure", severity: "High" },
            { id: "FUL009", name: "Fuel hose strikes", severity: "Medium" },
            { id: "FUL010", name: "Hot fueling risks", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // CARGO & ULD HANDLING
        // --------------------------------------------------------------------
        CARGO: [
            { id: "CRG001", name: "ULD crushing/trapping", severity: "Critical" },
            { id: "CRG002", name: "Unsecured cargo shift", severity: "High" },
            { id: "CRG003", name: "Cargo loader falls", severity: "High" },
            { id: "CRG004", name: "Manual handling of heavy items", severity: "Medium" },
            { id: "CRG005", name: "Cargo door operation injuries", severity: "High" },
            { id: "CRG006", name: "Cargo net/strap failures", severity: "High" },
            { id: "CRG007", name: "Conveyor entanglement", severity: "High" },
            { id: "CRG008", name: "Overloaded cargo positions", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // DE-ICING / ANTI-ICING
        // --------------------------------------------------------------------
        DEICER: [
            { id: "DEI001", name: "De-icing fluid exposure (skin/eyes)", severity: "Medium" },
            { id: "DEI002", name: "De-icing truck tip-over", severity: "Critical" },
            { id: "DEI003", name: "Falls from de-icing platforms", severity: "High" },
            { id: "DEI004", name: "Slippery conditions around aircraft", severity: "Medium" },
            { id: "DEI005", name: "Cold stress during de-icing ops", severity: "Medium" },
            { id: "DEI006", name: "Aircraft surface damage from de-icing", severity: "Medium" },
            { id: "DEI007", name: "Glycol fluid ingestion/aspiration", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // FOREIGN OBJECT DEBRIS (FOD)
        // --------------------------------------------------------------------
        FOD: [
            { id: "FOD001", name: "FOD ingestion into engine", severity: "Critical" },
            { id: "FOD002", name: "Tire damage from FOD", severity: "High" },
            { id: "FOD003", name: "FOD strike to personnel", severity: "Medium" },
            { id: "FOD004", name: "Tools left in aircraft", severity: "Critical" },
            { id: "FOD005", name: "Loose fasteners/hardware", severity: "High" },
            { id: "FOD006", name: "Debris blown by aircraft operations", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // DANGEROUS GOODS (DG) - IATA DGR
        // --------------------------------------------------------------------
        DGOOD: [
            { id: "DGD001", name: "Undeclared dangerous goods", severity: "Critical" },
            { id: "DGD002", name: "Improper DG packaging", severity: "Critical" },
            { id: "DGD003", name: "DG leakage/spillage", severity: "Critical" },
            { id: "DGD004", name: "Incompatible DG loading", severity: "Critical" },
            { id: "DGD005", name: "Lithium battery thermal runaway", severity: "Critical" },
            { id: "DGD006", name: "Radioactive material exposure", severity: "Critical" },
            { id: "DGD007", name: "Infectious substance exposure", severity: "Critical" },
            { id: "DGD008", name: "Corrosive material burns", severity: "High" },
            { id: "DGD009", name: "Toxic gas release", severity: "Critical" },
            { id: "DGD010", name: "Oxidizer reaction with combustibles", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // CABIN SAFETY
        // --------------------------------------------------------------------
        CABIN: [
            { id: "CAB001", name: "Passenger turbulence injuries", severity: "High" },
            { id: "CAB002", name: "Galley equipment burns", severity: "Medium" },
            { id: "CAB003", name: "Overhead bin falling objects", severity: "Medium" },
            { id: "CAB004", name: "Emergency exit operation injuries", severity: "High" },
            { id: "CAB005", name: "Smoke/fumes in cabin", severity: "Critical" },
            { id: "CAB006", name: "Slip/trip in cabin/galley", severity: "Medium" },
            { id: "CAB007", name: "Aggressive passenger incidents", severity: "High" },
            { id: "CAB008", name: "Medical emergencies", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // BIRD & WILDLIFE STRIKES
        // --------------------------------------------------------------------
        BIRD: [
            { id: "BRD001", name: "Bird strike to engines", severity: "Critical" },
            { id: "BRD002", name: "Bird strike to windscreen", severity: "Critical" },
            { id: "BRD003", name: "Wildlife on runway", severity: "High" },
            { id: "BRD004", name: "Bird strike during takeoff/landing", severity: "Critical" },
            { id: "BRD005", name: "Multiple bird ingestion", severity: "Critical" }
        ],

        // ====================================================================
        // OIL & GAS / API / IOGP HAZARDS
        // ====================================================================

        // --------------------------------------------------------------------
        // DRILLING OPERATIONS - API RP
        // --------------------------------------------------------------------
        DRILLING: [
            { id: "DRL001", name: "Drill string failure", severity: "Critical" },
            { id: "DRL002", name: "Rotary table/kelly bushing hazards", severity: "Critical" },
            { id: "DRL003", name: "Pipe handling/makeup injuries", severity: "High" },
            { id: "DRL004", name: "Stuck pipe/fishing operations", severity: "High" },
            { id: "DRL005", name: "Mud system hazards", severity: "High" },
            { id: "DRL006", name: "Derrick/mast climbing falls", severity: "Critical" },
            { id: "DRL007", name: "Crown/traveling block hazards", severity: "Critical" },
            { id: "DRL008", name: "Shale shaker hazards", severity: "Medium" },
            { id: "DRL009", name: "Casing running operations", severity: "High" },
            { id: "DRL010", name: "Top drive system failures", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // HYDROGEN SULFIDE (H2S) - API RP 49
        // --------------------------------------------------------------------
        H2S: [
            { id: "H2S001", name: "H2S gas release", severity: "Critical" },
            { id: "H2S002", name: "H2S exposure - immediate incapacitation", severity: "Critical" },
            { id: "H2S003", name: "H2S detector failure", severity: "Critical" },
            { id: "H2S004", name: "Inadequate wind sock monitoring", severity: "High" },
            { id: "H2S005", name: "SCBA not available/functional", severity: "Critical" },
            { id: "H2S006", name: "Muster point in downwind location", severity: "Critical" },
            { id: "H2S007", name: "H2S in confined space", severity: "Critical" },
            { id: "H2S008", name: "Rescue attempt without protection", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // WELL CONTROL / BLOWOUT PREVENTION - API RP 59
        // --------------------------------------------------------------------
        BLOWOUT: [
            { id: "BOP001", name: "Kick/well influx", severity: "Critical" },
            { id: "BOP002", name: "Blowout preventer (BOP) failure", severity: "Critical" },
            { id: "BOP003", name: "Uncontrolled well flow", severity: "Critical" },
            { id: "BOP004", name: "Underground blowout", severity: "Critical" },
            { id: "BOP005", name: "Gas migration to surface", severity: "Critical" },
            { id: "BOP006", name: "Inadequate mud weight", severity: "High" },
            { id: "BOP007", name: "Lost circulation", severity: "High" },
            { id: "BOP008", name: "Pressure buildup in annulus", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // PIPELINE OPERATIONS - API 1160
        // --------------------------------------------------------------------
        PIPELINE: [
            { id: "PIP001", name: "Pipeline rupture", severity: "Critical" },
            { id: "PIP002", name: "Third-party damage (excavation)", severity: "Critical" },
            { id: "PIP003", name: "Corrosion failure", severity: "High" },
            { id: "PIP004", name: "Pig launching/receiving hazards", severity: "High" },
            { id: "PIP005", name: "High pressure testing incidents", severity: "Critical" },
            { id: "PIP006", name: "Pipeline crossing hazards", severity: "Medium" },
            { id: "PIP007", name: "Vapor cloud from leak", severity: "Critical" },
            { id: "PIP008", name: "Pipeline fire/explosion", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // OFFSHORE OPERATIONS - API RP 2A
        // --------------------------------------------------------------------
        OFFSHORE: [
            { id: "OFF001", name: "Helicopter operations accidents", severity: "Critical" },
            { id: "OFF002", name: "Man overboard", severity: "Critical" },
            { id: "OFF003", name: "Personnel transfer (swing rope/basket)", severity: "High" },
            { id: "OFF004", name: "Platform structural failure", severity: "Critical" },
            { id: "OFF005", name: "Supply vessel collision", severity: "Critical" },
            { id: "OFF006", name: "Lifeboat drill injuries", severity: "High" },
            { id: "OFF007", name: "Crane operations over water", severity: "High" },
            { id: "OFF008", name: "Extreme weather/evacuation", severity: "Critical" },
            { id: "OFF009", name: "Platform fire", severity: "Critical" },
            { id: "OFF010", name: "Toxic gas accumulation in modules", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // HYDROCARBON RELEASE
        // --------------------------------------------------------------------
        HYDROCARB: [
            { id: "HYD001", name: "Flange/gasket leak", severity: "High" },
            { id: "HYD002", name: "Process vessel rupture", severity: "Critical" },
            { id: "HYD003", name: "Tank overfill", severity: "High" },
            { id: "HYD004", name: "Loading/unloading spills", severity: "High" },
            { id: "HYD005", name: "Vapor cloud explosion (VCE)", severity: "Critical" },
            { id: "HYD006", name: "Pool fire", severity: "Critical" },
            { id: "HYD007", name: "Jet fire", severity: "Critical" },
            { id: "HYD008", name: "BLEVE (boiling liquid expanding vapor)", severity: "Critical" }
        ],

        // --------------------------------------------------------------------
        // LIFTING OPERATIONS - IOGP Life-Saving Rules
        // --------------------------------------------------------------------
        LIFTING: [
            { id: "LFT001", name: "Dropped object from crane", severity: "Critical" },
            { id: "LFT002", name: "Personnel under suspended load", severity: "Critical" },
            { id: "LFT003", name: "Rigging failure", severity: "Critical" },
            { id: "LFT004", name: "Crane overloading", severity: "Critical" },
            { id: "LFT005", name: "Uncontrolled load movement", severity: "High" },
            { id: "LFT006", name: "Banksman/signaler struck", severity: "Critical" },
            { id: "LFT007", name: "Forklift overturning", severity: "Critical" },
            { id: "LFT008", name: "Manual handling during lift setup", severity: "Medium" }
        ],

        // --------------------------------------------------------------------
        // COMMERCIAL DIVING - API RP 2D
        // --------------------------------------------------------------------
        DIVING: [
            { id: "DIV001", name: "Decompression sickness (the bends)", severity: "Critical" },
            { id: "DIV002", name: "Breathing gas supply failure", severity: "Critical" },
            { id: "DIV003", name: "Diver entanglement", severity: "Critical" },
            { id: "DIV004", name: "Hypothermia", severity: "High" },
            { id: "DIV005", name: "Diving bell failure", severity: "Critical" },
            { id: "DIV006", name: "Diver struck by vessel/equipment", severity: "Critical" },
            { id: "DIV007", name: "Lost communication with surface", severity: "High" },
            { id: "DIV008", name: "Nitrogen narcosis", severity: "High" },
            { id: "DIV009", name: "High pressure nervous syndrome", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // HOT WORK OPERATIONS - IOGP Life-Saving Rules
        // --------------------------------------------------------------------
        HOTWORK: [
            { id: "HOT001", name: "Fire from hot work sparks", severity: "Critical" },
            { id: "HOT002", name: "Explosion in hazardous area", severity: "Critical" },
            { id: "HOT003", name: "Inadequate fire watch", severity: "High" },
            { id: "HOT004", name: "Welding on pressurized equipment", severity: "Critical" },
            { id: "HOT005", name: "Hot work permit violations", severity: "High" },
            { id: "HOT006", name: "Residual hydrocarbons ignition", severity: "Critical" },
            { id: "HOT007", name: "Cutting into unknown piping", severity: "Critical" },
            { id: "HOT008", name: "Smoldering fire after work completion", severity: "High" }
        ],

        // --------------------------------------------------------------------
        // SIMULTANEOUS OPERATIONS (SIMOPS)
        // --------------------------------------------------------------------
        SIMOPS: [
            { id: "SIM001", name: "Drilling during production operations", severity: "Critical" },
            { id: "SIM002", name: "Construction near live systems", severity: "Critical" },
            { id: "SIM003", name: "Multiple crane operations", severity: "High" },
            { id: "SIM004", name: "Marine/helicopter ops conflict", severity: "Critical" },
            { id: "SIM005", name: "Hot work during hazardous operations", severity: "Critical" },
            { id: "SIM006", name: "Inadequate communication between teams", severity: "High" },
            { id: "SIM007", name: "Unplanned interface between activities", severity: "High" },
            { id: "SIM008", name: "Emergency response confusion during SIMOPS", severity: "Critical" }
        ]
    },

    // ========================================================================
    // CONTROL MEASURES BY CATEGORY
    // ========================================================================
    controlMeasures: {
        SLIP: [
            "Install non-slip flooring in high-risk areas",
            "Implement immediate spillage cleanup procedures",
            "Ensure adequate lighting in all walkways",
            "Use cable management systems/covers",
            "Provide appropriate footwear",
            "Install handrails on stairs and ramps",
            "Regular floor condition inspections",
            "Use warning signs for wet floors",
            "Keep walkways clear of obstructions",
            "Apply anti-slip treatments to surfaces"
        ],
        MANUAL: [
            "Use mechanical handling aids (trolleys, hoists)",
            "Provide manual handling training",
            "Reduce load weights where possible",
            "Ensure loads have good handholds",
            "Allow adequate rest breaks",
            "Plan lifting operations (team lifts)",
            "Store heavy items at waist height",
            "Rotate tasks to reduce repetitive strain",
            "Assess individual capability",
            "Design workstations ergonomically"
        ],
        HEIGHT: [
            "Avoid work at height where possible",
            "Use collective protection (guardrails, nets)",
            "Use work platforms instead of ladders",
            "Provide fall arrest systems",
            "Inspect all access equipment before use",
            "Ensure competent persons supervise",
            "Consider weather conditions",
            "Use toe boards to prevent falling objects",
            "Provide rescue plans",
            "Secure all tools and materials"
        ],
        MACHINE: [
            "Install adequate machine guarding",
            "Implement lockout/tagout (LOTO) procedures",
            "Provide machine-specific training",
            "Regular maintenance and inspection",
            "Use emergency stop devices",
            "Ensure adequate lighting at workstations",
            "Keep work areas clean",
            "Use appropriate PPE",
            "Follow manufacturer instructions",
            "Implement permit-to-work for maintenance"
        ],
        ELECTRIC: [
            "Regular inspection and testing (PAT)",
            "Use RCDs (residual current devices)",
            "Implement safe isolation procedures",
            "Keep electrical equipment away from water",
            "Use appropriate voltage for the task",
            "Ensure competent persons perform electrical work",
            "Provide proper cable management",
            "Use insulated tools",
            "Mark electrical hazards clearly",
            "Implement permit-to-work systems"
        ],
        FIRE: [
            "Maintain clear fire escape routes",
            "Provide appropriate fire extinguishers",
            "Install smoke/heat detection systems",
            "Implement hot work permits",
            "Store flammables in proper containers",
            "Control ignition sources",
            "Regular fire drills and training",
            "Maintain emergency lighting",
            "Good housekeeping practices",
            "Fire risk assessment and review"
        ],
        CHEMICAL: [
            "Substitute with less hazardous substances",
            "Provide local exhaust ventilation (LEV)",
            "Use appropriate PPE (gloves, masks, goggles)",
            "Ensure SDS sheets are available",
            "Provide COSHH training",
            "Implement proper storage procedures",
            "Use spill containment measures",
            "Provide emergency eyewash/showers",
            "Monitor exposure levels",
            "Health surveillance for exposed workers"
        ],
        NOISE: [
            "Reduce noise at source",
            "Use sound-absorbing materials",
            "Provide hearing protection zones",
            "Rotate workers to limit exposure",
            "Regular noise assessments",
            "Health surveillance (hearing tests)",
            "Maintain equipment to reduce noise",
            "Use quieter equipment alternatives",
            "Provide suitable hearing protection",
            "Display warning signs in high-noise areas"
        ],
        VIBRATION: [
            "Select low-vibration equipment",
            "Maintain tools to reduce vibration",
            "Limit exposure time",
            "Provide anti-vibration gloves",
            "Health surveillance for exposed workers",
            "Rotate tasks to limit exposure",
            "Keep hands warm in cold conditions",
            "Train workers on vibration risks",
            "Use dampened seating in vehicles"
        ],
        RADIATION: [
            "Minimize exposure time",
            "Maximize distance from source",
            "Use appropriate shielding",
            "Monitor radiation levels",
            "Provide dosimeters for workers",
            "Implement controlled areas",
            "Use warning signs and barriers",
            "Provide UV protection for outdoor work",
            "Regular equipment testing"
        ],
        CONFINED: [
            "Avoid entry where possible",
            "Test atmosphere before entry",
            "Provide continuous ventilation",
            "Use gas detection equipment",
            "Implement permit-to-work system",
            "Provide rescue equipment and trained personnel",
            "Maintain communication with entrant",
            "Use breathing apparatus when required",
            "Emergency procedures in place"
        ],
        TRANSPORT: [
            "Separate pedestrians from vehicles",
            "Implement one-way traffic systems",
            "Provide safe crossing points",
            "Use speed limits and barriers",
            "Ensure good visibility and lighting",
            "Train and authorize drivers",
            "Regular vehicle maintenance",
            "Use reversing aids (cameras, sensors)",
            "Implement traffic management plans",
            "Use high-visibility clothing"
        ],
        DSE: [
            "Provide adjustable workstations",
            "Ensure adequate lighting",
            "Take regular breaks from screen",
            "Position monitors correctly",
            "Provide DSE assessments",
            "Offer eye tests for DSE users",
            "Use document holders",
            "Provide ergonomic keyboards/mice",
            "Train users on correct posture"
        ],
        STRESS: [
            "Clear job roles and expectations",
            "Provide adequate resources and training",
            "Encourage open communication",
            "Implement anti-bullying policies",
            "Offer employee assistance programs",
            "Allow flexible working where possible",
            "Regular workload reviews",
            "Manager training on mental health",
            "Return-to-work support programs"
        ],
        BIOLOGICAL: [
            "Implement infection control procedures",
            "Provide vaccination programs",
            "Use sharps containers",
            "Ensure proper waste disposal",
            "Provide appropriate PPE",
            "Maintain hygiene facilities",
            "Regular legionella testing",
            "Food hygiene training",
            "Health surveillance where required"
        ],
        ASBESTOS: [
            "Identify and record asbestos location",
            "Implement asbestos management plan",
            "Do not disturb asbestos materials",
            "Use licensed contractors for removal",
            "Provide asbestos awareness training",
            "Regular condition monitoring",
            "Emergency procedures for damage",
            "Air monitoring during work"
        ],
        PRESSURE: [
            "Regular examination by competent person",
            "Implement written schemes of examination",
            "Install pressure relief devices",
            "Maintain to manufacturer specifications",
            "Train operators properly",
            "Use correct pressure ratings",
            "Store cylinders safely",
            "Inspect before use"
        ],
        PPE: [
            "Select PPE based on risk assessment",
            "Ensure proper fit for each worker",
            "Train on correct use and limitations",
            "Regular inspection and replacement",
            "Provide storage facilities",
            "Clean and maintain PPE",
            "Check compatibility of multiple PPE",
            "Record PPE issue and training"
        ],
        ENVIRONMENT: [
            "Provide adequate heating/cooling",
            "Ensure sufficient lighting levels",
            "Monitor temperature and humidity",
            "Provide rest facilities",
            "Issue weather-appropriate clothing",
            "Adjust work schedules for extreme conditions",
            "Maintain ventilation systems",
            "Provide hydration facilities"
        ],
        ERGONOMIC: [
            "Design workstations ergonomically",
            "Allow job rotation",
            "Provide adjustable equipment",
            "Train on correct techniques",
            "Encourage micro-breaks",
            "Provide anti-fatigue mats for standing",
            "Assess tasks for ergonomic risks",
            "Modify tasks to reduce strain"
        ],

        // ====================================================================
        // OSHA-SPECIFIC CONTROL MEASURES
        // ====================================================================
        LOCKOUT: [
            "Develop written LOTO procedures for each machine",
            "Provide individual locks for each worker",
            "Train all affected and authorized employees",
            "Conduct periodic inspections of LOTO procedures",
            "Use tagout devices with locks",
            "Verify zero energy state before work",
            "Account for all energy sources",
            "Implement group lockout procedures",
            "Coordinate LOTO for contractor activities"
        ],
        EXCAVATION: [
            "Conduct daily inspections by competent person",
            "Install protective systems (sloping, shoring, shielding)",
            "Locate underground utilities before digging (call 811)",
            "Keep spoil pile at least 2 feet from edge",
            "Provide safe means of egress within 25 feet",
            "Test atmosphere in deep excavations",
            "Install barriers around excavations",
            "Keep heavy equipment away from edges",
            "Dewater excavations as needed"
        ],
        SCAFFOLD: [
            "Erect scaffolds under competent person supervision",
            "Install guardrails, midrails, and toeboards",
            "Ensure proper foundation and support",
            "Do not exceed rated load capacity",
            "Inspect scaffolds before each work shift",
            "Provide safe access (ladders, stairs)",
            "Maintain 10-foot clearance from power lines",
            "Use fall protection as required",
            "Tag defective scaffolds out of service"
        ],
        CRANE: [
            "Verify lift plan before each lift",
            "Conduct pre-operation inspections",
            "Use trained and certified operators",
            "Establish exclusion zones during lifts",
            "Use qualified signal persons",
            "Never exceed rated load capacity",
            "Maintain power line clearance distances",
            "Verify ground conditions for outriggers",
            "Inspect rigging before each use",
            "Use tag lines to control loads"
        ],
        WELDING: [
            "Ensure adequate ventilation/LEV",
            "Use appropriate welding screens",
            "Provide proper welding helmets with correct shade",
            "Remove combustibles from hot work area",
            "Obtain hot work permit when required",
            "Maintain fire watch during and after welding",
            "Inspect equipment before use",
            "Store gas cylinders properly",
            "Ground welding equipment properly"
        ],
        RESPIRE: [
            "Conduct workplace exposure assessment",
            "Select NIOSH-approved respirators",
            "Implement fit testing program",
            "Provide medical evaluations for users",
            "Train on proper use, maintenance, and limitations",
            "Establish cleaning and storage procedures",
            "Monitor filter/cartridge change schedules",
            "Maintain written respiratory protection program"
        ],
        HAZWASTE: [
            "Conduct site characterization",
            "Develop site-specific safety plan",
            "Establish work zones (exclusion, reduction, support)",
            "Use air monitoring equipment",
            "Provide appropriate PPE based on hazards",
            "Implement decontamination procedures",
            "Train all personnel to HAZWOPER levels",
            "Establish emergency response procedures",
            "Conduct medical surveillance"
        ],
        PROCESS: [
            "Maintain process hazard analysis (PHA) current",
            "Implement management of change (MOC) procedures",
            "Conduct pre-startup safety reviews",
            "Maintain mechanical integrity program",
            "Develop and follow operating procedures",
            "Train all process operators",
            "Manage contractor safety requirements",
            "Conduct incident investigations",
            "Perform compliance audits"
        ],

        // ====================================================================
        // AVIATION / IATA CONTROL MEASURES
        // ====================================================================
        AIRCRAFT: [
            "Use aircraft approach procedures (wing walker)",
            "Maintain safe distances from operating aircraft",
            "Establish engine run-up exclusion zones",
            "Use chocks and brakes when parked",
            "Follow towing procedures with qualified personnel",
            "Inspect ground equipment before use",
            "Use proper PPE (hearing, high-vis)",
            "Brief crew on aircraft-specific hazards"
        ],
        RAMP: [
            "Establish pedestrian walkways and crossings",
            "Implement speed limits for GSE",
            "Use high-visibility clothing at all times",
            "Conduct FOD walks regularly",
            "Brief personnel on active runways/taxiways",
            "Use proper communication protocols",
            "Maintain clear lines of sight",
            "Control vehicle movements with marshalling"
        ],
        JETBLAST: [
            "Establish jet blast danger zones",
            "Post warning signs and markings",
            "Secure all loose equipment",
            "Train personnel on jet blast awareness",
            "Use barriers where practical",
            "Monitor engine run-ups closely"
        ],
        FUELING: [
            "Verify bonding/grounding connections",
            "Use deadman controls on fuel nozzles",
            "No smoking/ignition sources within 50 feet",
            "Monitor for fuel spills constantly",
            "Have fire extinguishers readily available",
            "Follow fuel quality control procedures",
            "Limit personnel near fueling operations",
            "Provide fuel spill response equipment"
        ],
        CARGO: [
            "Train personnel on ULD handling procedures",
            "Use proper lifting techniques",
            "Secure cargo according to load plans",
            "Inspect cargo nets and straps before use",
            "Use fall protection at cargo door openings",
            "Verify weight and balance calculations",
            "Use mechanical handling equipment when possible"
        ],
        DEICER: [
            "Wear appropriate PPE (goggles, gloves)",
            "Follow manufacturer instructions for de-icing fluids",
            "Secure de-icing equipment properly",
            "Monitor weather conditions continuously",
            "Ensure proper hold-over time calculations",
            "Clean up glycol spills promptly",
            "Prevent slips on contaminated surfaces"
        ],
        FOD: [
            "Conduct regular FOD walks/inspections",
            "Use FOD containers on all equipment",
            "Secure loose items and clothing",
            "Account for all tools (tool control program)",
            "Report and remove FOD immediately",
            "Install FOD collection devices on equipment"
        ],
        DGOOD: [
            "Verify DG documentation accuracy",
            "Inspect packaging condition before acceptance",
            "Ensure proper labeling and marking",
            "Follow compatibility requirements for loading",
            "Provide DG training for all handlers",
            "Have emergency procedures readily available",
            "Notify pilot and load master of DG onboard",
            "Maintain DG incident response capabilities"
        ],
        CABIN: [
            "Enforce seatbelt compliance during turbulence",
            "Secure galley equipment during flight",
            "Monitor overhead bins for proper closure",
            "Train crew on emergency procedures",
            "Maintain medical kit and AED readiness",
            "Follow de-escalation procedures for disruptions"
        ],
        BIRD: [
            "Implement wildlife management program",
            "Report all bird strikes",
            "Coordinate with airport wildlife control",
            "Be alert during dawn/dusk operations",
            "Use habitat modification techniques"
        ],

        // ====================================================================
        // OIL & GAS CONTROL MEASURES
        // ====================================================================
        DRILLING: [
            "Conduct toolbox talks before operations",
            "Use hands-free pipe handling equipment",
            "Implement iron roughneck for makeup/breakout",
            "Ensure proper derrick climbing procedures",
            "Maintain rig floor housekeeping",
            "Train on emergency procedures",
            "Conduct regular equipment inspections",
            "Use personal fall protection systems"
        ],
        H2S: [
            "Install fixed and portable H2S detectors",
            "Post wind socks and escape routes",
            "Provide SCBA at muster points",
            "Conduct H2S awareness training",
            "Brief all personnel on H2S dangers",
            "Establish buddy system in H2S areas",
            "Test breathing apparatus regularly",
            "Develop and drill evacuation plans"
        ],
        BLOWOUT: [
            "Maintain well control equipment (BOP) tested",
            "Train crews in well control procedures",
            "Monitor mud weight and returns continuously",
            "Conduct kick drills regularly",
            "Have kill weight mud available",
            "Test BOP function regularly",
            "Follow barrier management principles",
            "Maintain diverter system readiness"
        ],
        PIPELINE: [
            "Implement integrity management program",
            "Conduct regular inline inspections",
            "Mark pipeline locations clearly",
            "Coordinate third-party excavation activities",
            "Monitor SCADA for anomalies",
            "Maintain emergency response capabilities",
            "Train personnel on leak detection"
        ],
        OFFSHORE: [
            "Conduct helicopter safety training (HUET/BOSIET)",
            "Maintain life-saving equipment inspected",
            "Hold regular emergency drills",
            "Monitor weather forecasts continuously",
            "Establish clear procedures for personnel transfer",
            "Maintain collision avoidance for vessels",
            "Provide flotation devices for over-water work"
        ],
        HYDROCARB: [
            "Implement leak detection and repair (LDAR) program",
            "Conduct regular integrity inspections",
            "Maintain gas detection systems",
            "Follow startup/shutdown procedures",
            "Use double block and bleed isolation",
            "Maintain emergency shutdown systems",
            "Train on spill response procedures"
        ],
        LIFTING: [
            "Develop lift plans for critical lifts",
            "Use certified rigging and equipment",
            "Establish drop zones/exclusion areas",
            "Appoint competent lifting supervisor",
            "Conduct pre-lift meetings",
            "Never walk under suspended loads",
            "Inspect slings and shackles before use"
        ],
        DIVING: [
            "Follow IMCA/ADCI diving standards",
            "Conduct dive medical examinations",
            "Use dive control systems with redundancy",
            "Monitor diver continuously from surface",
            "Have standby diver ready at all times",
            "Calculate decompression schedules properly",
            "Test breathing gas quality"
        ],
        HOTWORK: [
            "Obtain hot work permit from authority",
            "Test atmosphere before and during work",
            "Remove or protect combustibles",
            "Post fire watch during and 60 min after",
            "Have fire extinguishing equipment ready",
            "Isolate process systems (double block)",
            "Verify equipment depressurized and drained"
        ],
        SIMOPS: [
            "Hold SIMOPS planning meetings",
            "Develop SIMOPS matrix for all activities",
            "Assign SIMOPS coordinator",
            "Establish clear communication protocols",
            "Identify and manage interfaces",
            "Brief all parties on concurrent activities",
            "Have stop-work authority available"
        ]
    },

    // ========================================================================
    // RISK MATRIX (5x5 Standard HSE Matrix)
    // ========================================================================
    riskMatrix: {
        likelihood: [
            { value: 1, label: "Rare", description: "May only occur in exceptional circumstances" },
            { value: 2, label: "Unlikely", description: "Could occur at some time" },
            { value: 3, label: "Possible", description: "Might occur at some time" },
            { value: 4, label: "Likely", description: "Will probably occur in most circumstances" },
            { value: 5, label: "Almost Certain", description: "Expected to occur in most circumstances" }
        ],
        severity: [
            { value: 1, label: "Negligible", description: "No injury or minor first aid" },
            { value: 2, label: "Minor", description: "First aid treatment, minor injury" },
            { value: 3, label: "Moderate", description: "Medical treatment, temporary disability" },
            { value: 4, label: "Major", description: "Serious injury, long-term disability" },
            { value: 5, label: "Catastrophic", description: "Death or permanent disability" }
        ],
        riskLevels: {
            "1-4": { level: "Low", color: "#22c55e", action: "Monitor and review" },
            "5-9": { level: "Medium", color: "#eab308", action: "Reduce if reasonably practicable" },
            "10-16": { level: "High", color: "#f97316", action: "Take action to reduce risk" },
            "17-25": { level: "Critical", color: "#ef4444", action: "Stop work until risk reduced" }
        }
    },

    // ========================================================================
    // INDUSTRY-SPECIFIC PRESETS
    // ========================================================================
    industryPresets: {
        // General Industries
        manufacturing: ["MACHINE", "MANUAL", "NOISE", "CHEMICAL", "TRANSPORT", "ELECTRIC", "LOCKOUT"],
        construction: ["HEIGHT", "MANUAL", "MACHINE", "TRANSPORT", "ELECTRIC", "CONFINED", "EXCAVATION", "SCAFFOLD", "CRANE"],
        office: ["DSE", "SLIP", "STRESS", "FIRE", "ERGONOMIC", "ENVIRONMENT"],
        warehouse: ["TRANSPORT", "MANUAL", "SLIP", "HEIGHT", "MACHINE", "FIRE"],
        healthcare: ["BIOLOGICAL", "MANUAL", "STRESS", "CHEMICAL", "SLIP", "RADIATION"],
        agriculture: ["MACHINE", "TRANSPORT", "CHEMICAL", "MANUAL", "HEIGHT", "BIOLOGICAL"],
        retail: ["MANUAL", "SLIP", "STRESS", "FIRE", "DSE"],
        hospitality: ["SLIP", "MANUAL", "FIRE", "STRESS", "CHEMICAL", "ENVIRONMENT"],
        
        // Aviation Industry (IATA/ICAO)
        aviation_ground: ["RAMP", "JETBLAST", "FUELING", "CARGO", "FOD", "AIRCRAFT", "NOISE", "MANUAL"],
        aviation_cargo: ["CARGO", "DGOOD", "MANUAL", "TRANSPORT", "RAMP", "FOD"],
        aviation_cabin: ["CABIN", "SLIP", "MANUAL", "STRESS", "FIRE", "BIOLOGICAL"],
        aviation_maintenance: ["AIRCRAFT", "HEIGHT", "CHEMICAL", "CONFINED", "ELECTRIC", "MACHINE", "FOD"],
        airport_operations: ["RAMP", "TRANSPORT", "BIRD", "FOD", "JETBLAST", "NOISE", "DEICER"],
        
        // Oil & Gas Industry (API/IOGP)
        oil_upstream: ["DRILLING", "H2S", "BLOWOUT", "CONFINED", "LIFTING", "HOTWORK", "PROCESS"],
        oil_midstream: ["PIPELINE", "HYDROCARB", "CONFINED", "HOTWORK", "EXCAVATION", "PROCESS"],
        oil_downstream: ["PROCESS", "CHEMICAL", "FIRE", "CONFINED", "HOTWORK", "HYDROCARB", "LOCKOUT"],
        offshore_platform: ["OFFSHORE", "H2S", "LIFTING", "CONFINED", "HOTWORK", "HELICOPTER", "DIVING"],
        oil_field_services: ["DRILLING", "LIFTING", "TRANSPORT", "MANUAL", "H2S", "HOTWORK"],
        petrochemical: ["PROCESS", "CHEMICAL", "FIRE", "CONFINED", "PRESSURE", "LOCKOUT", "RESPIRE"],
        
        // Heavy Industry
        mining: ["MACHINE", "EXCAVATION", "CONFINED", "TRANSPORT", "RESPIRE", "HEIGHT", "BLASTING"],
        steel_metals: ["MACHINE", "FIRE", "MANUAL", "NOISE", "CRANE", "WELDING", "LOCKOUT"],
        shipbuilding: ["WELDING", "CONFINED", "HEIGHT", "CRANE", "MACHINE", "NOISE", "CHEMICAL"],
        power_generation: ["ELECTRIC", "CONFINED", "LOCKOUT", "HEIGHT", "PRESSURE", "CHEMICAL"],
        
        // Specialized
        laboratory: ["CHEMICAL", "BIOLOGICAL", "RADIATION", "FIRE", "RESPIRE", "DSE"],
        emergency_services: ["HAZWASTE", "BIOLOGICAL", "FIRE", "TRANSPORT", "STRESS", "VIOLENCE"],
        telecommunications: ["HEIGHT", "ELECTRIC", "CONFINED", "TRANSPORT", "DSE"]
    },

    // ========================================================================
    // REGULATORY REFERENCES
    // ========================================================================
    regulatoryReferences: {
        OSHA: {
            generalIndustry: "29 CFR 1910",
            construction: "29 CFR 1926",
            maritime: "29 CFR 1915-1919",
            agriculture: "29 CFR 1928",
            topCited: [
                { standard: "1926.501", title: "Fall Protection", category: "HEIGHT" },
                { standard: "1910.134", title: "Respiratory Protection", category: "RESPIRE" },
                { standard: "1926.1053", title: "Ladders", category: "HEIGHT" },
                { standard: "1910.147", title: "Lockout/Tagout", category: "LOCKOUT" },
                { standard: "1910.1200", title: "Hazard Communication", category: "CHEMICAL" },
                { standard: "1926.451", title: "Scaffolding", category: "SCAFFOLD" },
                { standard: "1910.178", title: "Powered Industrial Trucks", category: "TRANSPORT" },
                { standard: "1926.1251", title: "Silica", category: "RESPIRE" },
                { standard: "1910.303", title: "Electrical", category: "ELECTRIC" },
                { standard: "1910.212", title: "Machine Guarding", category: "MACHINE" }
            ]
        },
        HSE_UK: {
            primaryLegislation: [
                "Health and Safety at Work Act 1974",
                "Management of Health and Safety at Work Regulations 1999",
                "COSHH Regulations 2002",
                "PUWER 1998",
                "LOLER 1998",
                "Work at Height Regulations 2005",
                "CDM Regulations 2015"
            ]
        },
        IATA: {
            standards: [
                { code: "ISAGO", title: "IATA Safety Audit for Ground Operations" },
                { code: "IGOM", title: "IATA Ground Operations Manual" },
                { code: "DGR", title: "Dangerous Goods Regulations" },
                { code: "AHM", title: "Airport Handling Manual" },
                { code: "IOSA", title: "IATA Operational Safety Audit" }
            ]
        },
        ICAO: {
            annexes: [
                { number: 6, title: "Operation of Aircraft" },
                { number: 14, title: "Aerodromes" },
                { number: 18, title: "Dangerous Goods" },
                { number: 19, title: "Safety Management" }
            ]
        },
        API: {
            recommendedPractices: [
                { code: "API RP 49", title: "Recommended Practice for Safe Drilling Operations" },
                { code: "API RP 54", title: "Occupational Safety for Oil and Gas Drilling" },
                { code: "API RP 2D", title: "Offshore Crane and Lifting" },
                { code: "API RP 75", title: "Safety and Environmental Management Systems" },
                { code: "API RP 1160", title: "Pipeline Operator Qualification" }
            ]
        },
        IOGP: {
            lifeSavingRules: [
                "Bypass safety controls",
                "Work authorization",
                "Confined space",
                "Driving",
                "Energy isolation",
                "Hot work",
                "Line of fire",
                "Lifting operations",
                "Work at height"
            ]
        }
    },

    // ========================================================================
    // STATISTICS & INSIGHTS
    // ========================================================================
    statistics: {
        summary: {
            totalCategories: 48,
            totalHazards: 370,
            standards: ["HSE UK", "OSHA", "IATA", "ICAO", "API", "IOGP"],
            industries: ["General", "Aviation", "Oil & Gas", "Construction", "Manufacturing"]
        },
        oshaTopCauses: [
            { rank: 1, cause: "Falls from elevation", percentage: 33.5 },
            { rank: 2, cause: "Struck by object", percentage: 11.1 },
            { rank: 3, cause: "Electrocution", percentage: 8.5 },
            { rank: 4, cause: "Caught in/between", percentage: 5.5 }
        ],
        aviationGroundAccidents: [
            { cause: "Equipment/vehicle collision", percentage: 28 },
            { cause: "Manual handling injuries", percentage: 22 },
            { cause: "Slips, trips, falls", percentage: 18 },
            { cause: "Struck by GSE/aircraft", percentage: 15 }
        ],
        oilGasIncidents: [
            { cause: "Struck by/caught in", percentage: 35 },
            { cause: "Falls", percentage: 20 },
            { cause: "Vehicle accidents", percentage: 15 },
            { cause: "Fires/explosions", percentage: 10 }
        ]
    },

    // ========================================================================
    // TRANSLATIONS - MULTI-LANGUAGE SUPPORT
    // ========================================================================
    translations: {
        // Supported languages
        supportedLanguages: [
            { code: "en", name: "English", direction: "ltr" },
            { code: "fr", name: "Français", direction: "ltr" },
            { code: "ar", name: "العربية", direction: "rtl" }
        ],

        // --------------------------------------------------------------------
        // HAZARD CATEGORY TRANSLATIONS
        // --------------------------------------------------------------------
        categories: {
            // === HSE UK / OSHA COMMON CATEGORIES ===
            SLIP: {
                en: "Slips, Trips & Falls",
                fr: "Glissades, Trébuchements et Chutes",
                ar: "الانزلاقات والتعثرات والسقوط"
            },
            MANUAL: {
                en: "Manual Handling / Ergonomics",
                fr: "Manutention Manuelle / Ergonomie",
                ar: "المناولة اليدوية / بيئة العمل"
            },
            HEIGHT: {
                en: "Working at Height",
                fr: "Travail en Hauteur",
                ar: "العمل على ارتفاع"
            },
            MACHINE: {
                en: "Machinery & Equipment",
                fr: "Machines et Équipements",
                ar: "الآلات والمعدات"
            },
            ELECTRIC: {
                en: "Electrical Hazards",
                fr: "Risques Électriques",
                ar: "المخاطر الكهربائية"
            },
            FIRE: {
                en: "Fire & Explosion",
                fr: "Incendie et Explosion",
                ar: "الحريق والانفجار"
            },
            CHEMICAL: {
                en: "Hazardous Substances (COSHH/HazCom)",
                fr: "Substances Dangereuses (COSHH/HazCom)",
                ar: "المواد الخطرة"
            },
            NOISE: {
                en: "Noise Exposure",
                fr: "Exposition au Bruit",
                ar: "التعرض للضوضاء"
            },
            VIBRATION: {
                en: "Vibration",
                fr: "Vibrations",
                ar: "الاهتزازات"
            },
            RADIATION: {
                en: "Radiation (Ionizing & Non-Ionizing)",
                fr: "Rayonnements (Ionisants et Non-Ionisants)",
                ar: "الإشعاع (المؤين وغير المؤين)"
            },
            CONFINED: {
                en: "Confined Spaces / Permit Required",
                fr: "Espaces Confinés / Permis Requis",
                ar: "الأماكن المحصورة / يتطلب تصريح"
            },
            TRANSPORT: {
                en: "Workplace Transport / PIV",
                fr: "Transport sur le Lieu de Travail",
                ar: "النقل في مكان العمل"
            },
            DSE: {
                en: "Display Screen Equipment / VDT",
                fr: "Écrans de Visualisation",
                ar: "معدات شاشات العرض"
            },
            STRESS: {
                en: "Work-Related Stress / Psychosocial",
                fr: "Stress au Travail / Risques Psychosociaux",
                ar: "الإجهاد المرتبط بالعمل"
            },
            BIOLOGICAL: {
                en: "Biological Hazards / Bloodborne",
                fr: "Risques Biologiques",
                ar: "المخاطر البيولوجية"
            },
            ASBESTOS: {
                en: "Asbestos",
                fr: "Amiante",
                ar: "الأسبستوس"
            },
            PRESSURE: {
                en: "Pressure Systems",
                fr: "Systèmes Sous Pression",
                ar: "أنظمة الضغط"
            },
            PPE: {
                en: "PPE Failures",
                fr: "Défaillances des EPI",
                ar: "فشل معدات الحماية الشخصية"
            },
            ENVIRONMENT: {
                en: "Environmental Conditions",
                fr: "Conditions Environnementales",
                ar: "الظروف البيئية"
            },
            ERGONOMIC: {
                en: "Ergonomic Hazards",
                fr: "Risques Ergonomiques",
                ar: "المخاطر المريحة"
            },

            // === OSHA-SPECIFIC CATEGORIES ===
            LOCKOUT: {
                en: "Lockout/Tagout (LOTO)",
                fr: "Consignation/Déconsignation (LOTO)",
                ar: "القفل والعزل (لوتو)"
            },
            EXCAVATION: {
                en: "Excavation & Trenching",
                fr: "Excavation et Tranchées",
                ar: "الحفر والخنادق"
            },
            SCAFFOLD: {
                en: "Scaffolding",
                fr: "Échafaudages",
                ar: "السقالات"
            },
            CRANE: {
                en: "Cranes & Rigging",
                fr: "Grues et Gréage",
                ar: "الرافعات والتزوير"
            },
            WELDING: {
                en: "Welding, Cutting & Brazing",
                fr: "Soudage, Découpage et Brasage",
                ar: "اللحام والقطع والنحاس"
            },
            RESPIRE: {
                en: "Respiratory Protection",
                fr: "Protection Respiratoire",
                ar: "حماية الجهاز التنفسي"
            },
            HAZWASTE: {
                en: "Hazardous Waste Operations (HAZWOPER)",
                fr: "Opérations sur Déchets Dangereux",
                ar: "عمليات النفايات الخطرة"
            },
            PROCESS: {
                en: "Process Safety Management (PSM)",
                fr: "Gestion de la Sécurité des Procédés",
                ar: "إدارة سلامة العمليات"
            },

            // === AVIATION / IATA / ICAO CATEGORIES ===
            AIRCRAFT: {
                en: "Aircraft Operations",
                fr: "Opérations Aéronautiques",
                ar: "عمليات الطائرات"
            },
            RAMP: {
                en: "Ramp / Ground Operations",
                fr: "Opérations au Sol / Piste",
                ar: "عمليات المنحدر / الأرض"
            },
            JETBLAST: {
                en: "Jet Blast & Propeller Wash",
                fr: "Souffle Réacteur et Hélice",
                ar: "انفجار المحرك النفاث وغسيل المروحة"
            },
            FUELING: {
                en: "Aircraft Fueling",
                fr: "Avitaillement en Carburant",
                ar: "تزويد الطائرات بالوقود"
            },
            CARGO: {
                en: "Cargo & ULD Handling",
                fr: "Manutention Fret et ULD",
                ar: "مناولة البضائع وحاويات الشحن"
            },
            DEICER: {
                en: "De-icing / Anti-icing",
                fr: "Dégivrage / Antigivrage",
                ar: "إزالة الجليد / مقاومة التجمد"
            },
            FOD: {
                en: "Foreign Object Debris (FOD)",
                fr: "Débris d'Objets Étrangers (FOD)",
                ar: "حطام الأجسام الغريبة"
            },
            DGOOD: {
                en: "Dangerous Goods (DG)",
                fr: "Marchandises Dangereuses",
                ar: "البضائع الخطرة"
            },
            CABIN: {
                en: "Cabin Safety",
                fr: "Sécurité Cabine",
                ar: "سلامة المقصورة"
            },
            BIRD: {
                en: "Bird & Wildlife Strikes",
                fr: "Collisions Aviaires et Faune",
                ar: "اصطدام الطيور والحياة البرية"
            },

            // === OIL & GAS / API / IOGP CATEGORIES ===
            DRILLING: {
                en: "Drilling Operations",
                fr: "Opérations de Forage",
                ar: "عمليات الحفر"
            },
            H2S: {
                en: "Hydrogen Sulfide (H2S)",
                fr: "Sulfure d'Hydrogène (H2S)",
                ar: "كبريتيد الهيدروجين"
            },
            BLOWOUT: {
                en: "Well Control / Blowout Prevention",
                fr: "Contrôle de Puits / Prévention des Éruptions",
                ar: "التحكم في البئر / منع الانفجار"
            },
            PIPELINE: {
                en: "Pipeline Operations",
                fr: "Opérations de Pipeline",
                ar: "عمليات خطوط الأنابيب"
            },
            OFFSHORE: {
                en: "Offshore Operations",
                fr: "Opérations Offshore",
                ar: "العمليات البحرية"
            },
            HYDROCARB: {
                en: "Hydrocarbon Release",
                fr: "Libération d'Hydrocarbures",
                ar: "تسرب الهيدروكربونات"
            },
            LIFTING: {
                en: "Lifting Operations",
                fr: "Opérations de Levage",
                ar: "عمليات الرفع"
            },
            DIVING: {
                en: "Commercial Diving",
                fr: "Plongée Commerciale",
                ar: "الغوص التجاري"
            },
            HOTWORK: {
                en: "Hot Work Operations",
                fr: "Travaux par Points Chauds",
                ar: "أعمال اللهب المكشوف"
            },
            SIMOPS: {
                en: "Simultaneous Operations (SIMOPS)",
                fr: "Opérations Simultanées (SIMOPS)",
                ar: "العمليات المتزامنة"
            }
        },

        // --------------------------------------------------------------------
        // RISK MATRIX TRANSLATIONS
        // --------------------------------------------------------------------
        riskMatrix: {
            likelihood: {
                rare: { en: "Rare", fr: "Rare", ar: "نادر" },
                unlikely: { en: "Unlikely", fr: "Improbable", ar: "غير محتمل" },
                possible: { en: "Possible", fr: "Possible", ar: "ممكن" },
                likely: { en: "Likely", fr: "Probable", ar: "محتمل" },
                almostCertain: { en: "Almost Certain", fr: "Quasi Certain", ar: "شبه مؤكد" }
            },
            severity: {
                negligible: { en: "Negligible", fr: "Négligeable", ar: "ضئيل" },
                minor: { en: "Minor", fr: "Mineur", ar: "طفيف" },
                moderate: { en: "Moderate", fr: "Modéré", ar: "متوسط" },
                major: { en: "Major", fr: "Majeur", ar: "كبير" },
                catastrophic: { en: "Catastrophic", fr: "Catastrophique", ar: "كارثي" }
            },
            riskLevel: {
                low: { en: "Low", fr: "Faible", ar: "منخفض" },
                medium: { en: "Medium", fr: "Moyen", ar: "متوسط" },
                high: { en: "High", fr: "Élevé", ar: "مرتفع" },
                critical: { en: "Critical", fr: "Critique", ar: "حرج" }
            }
        },

        // --------------------------------------------------------------------
        // UI LABELS TRANSLATIONS
        // --------------------------------------------------------------------
        ui: {
            // Headers
            riskAssessment: { en: "Risk Assessment", fr: "Évaluation des Risques", ar: "تقييم المخاطر" },
            hazardIdentification: { en: "Hazard Identification", fr: "Identification des Dangers", ar: "تحديد المخاطر" },
            controlMeasures: { en: "Control Measures", fr: "Mesures de Contrôle", ar: "تدابير السيطرة" },
            residualRisk: { en: "Residual Risk", fr: "Risque Résiduel", ar: "المخاطر المتبقية" },

            // Buttons
            addHazard: { en: "Add Hazard", fr: "Ajouter un Danger", ar: "إضافة خطر" },
            removeHazard: { en: "Remove Hazard", fr: "Supprimer le Danger", ar: "إزالة الخطر" },
            generateReport: { en: "Generate Report", fr: "Générer le Rapport", ar: "إنشاء التقرير" },
            exportPDF: { en: "Export to PDF", fr: "Exporter en PDF", ar: "تصدير إلى PDF" },
            exportExcel: { en: "Export to Excel", fr: "Exporter vers Excel", ar: "تصدير إلى Excel" },
            save: { en: "Save", fr: "Enregistrer", ar: "حفظ" },
            cancel: { en: "Cancel", fr: "Annuler", ar: "إلغاء" },
            
            // Form Labels
            selectCategory: { en: "Select Category", fr: "Sélectionner une Catégorie", ar: "اختر الفئة" },
            selectHazard: { en: "Select Hazard", fr: "Sélectionner un Danger", ar: "اختر الخطر" },
            selectLikelihood: { en: "Select Likelihood", fr: "Sélectionner la Probabilité", ar: "اختر الاحتمالية" },
            selectSeverity: { en: "Select Severity", fr: "Sélectionner la Gravité", ar: "اختر الشدة" },
            personsAtRisk: { en: "Persons at Risk", fr: "Personnes à Risque", ar: "الأشخاص المعرضون للخطر" },
            existingControls: { en: "Existing Controls", fr: "Contrôles Existants", ar: "التدابير الحالية" },
            additionalControls: { en: "Additional Controls Required", fr: "Contrôles Supplémentaires Requis", ar: "تدابير إضافية مطلوبة" },
            responsiblePerson: { en: "Responsible Person", fr: "Personne Responsable", ar: "الشخص المسؤول" },
            targetDate: { en: "Target Date", fr: "Date Cible", ar: "التاريخ المستهدف" },
            status: { en: "Status", fr: "Statut", ar: "الحالة" },
            
            // Status Options
            open: { en: "Open", fr: "Ouvert", ar: "مفتوح" },
            inProgress: { en: "In Progress", fr: "En Cours", ar: "قيد التنفيذ" },
            completed: { en: "Completed", fr: "Terminé", ar: "مكتمل" },
            overdue: { en: "Overdue", fr: "En Retard", ar: "متأخر" },

            // Messages
            noHazardsAdded: { en: "No hazards added yet", fr: "Aucun danger ajouté", ar: "لم تتم إضافة أي مخاطر بعد" },
            assessmentComplete: { en: "Assessment Complete", fr: "Évaluation Terminée", ar: "التقييم مكتمل" },
            savingChanges: { en: "Saving changes...", fr: "Enregistrement...", ar: "جاري الحفظ..." },
            changesSaved: { en: "Changes saved successfully", fr: "Modifications enregistrées", ar: "تم حفظ التغييرات بنجاح" },
            
            // Industry Selection
            selectIndustry: { en: "Select Industry", fr: "Sélectionner l'Industrie", ar: "اختر الصناعة" },
            manufacturing: { en: "Manufacturing", fr: "Fabrication", ar: "التصنيع" },
            construction: { en: "Construction", fr: "Construction", ar: "البناء" },
            aviation: { en: "Aviation", fr: "Aviation", ar: "الطيران" },
            oilAndGas: { en: "Oil & Gas", fr: "Pétrole et Gaz", ar: "النفط والغاز" },
            healthcare: { en: "Healthcare", fr: "Santé", ar: "الرعاية الصحية" },
            warehouse: { en: "Warehouse & Logistics", fr: "Entrepôt et Logistique", ar: "المستودعات واللوجستيات" },
            office: { en: "Office", fr: "Bureau", ar: "المكتب" },
            retail: { en: "Retail", fr: "Commerce de Détail", ar: "التجزئة" }
        },

        // --------------------------------------------------------------------
        // COMMON HAZARD TERMS TRANSLATIONS
        // --------------------------------------------------------------------
        hazardTerms: {
            // People at Risk
            employees: { en: "Employees", fr: "Employés", ar: "الموظفون" },
            contractors: { en: "Contractors", fr: "Sous-traitants", ar: "المقاولون" },
            visitors: { en: "Visitors", fr: "Visiteurs", ar: "الزوار" },
            publicMembers: { en: "Members of Public", fr: "Membres du Public", ar: "أفراد الجمهور" },
            youngWorkers: { en: "Young Workers", fr: "Jeunes Travailleurs", ar: "العمال الشباب" },
            pregnantWorkers: { en: "Pregnant Workers", fr: "Travailleuses Enceintes", ar: "العاملات الحوامل" },
            disabledPersons: { en: "Disabled Persons", fr: "Personnes Handicapées", ar: "ذوي الإعاقة" },
            loneWorkers: { en: "Lone Workers", fr: "Travailleurs Isolés", ar: "العمال المنفردون" },
            nightShiftWorkers: { en: "Night Shift Workers", fr: "Travailleurs de Nuit", ar: "عمال النوبة الليلية" },
            maintenanceStaff: { en: "Maintenance Staff", fr: "Personnel de Maintenance", ar: "موظفو الصيانة" },

            // Consequence Types
            fatality: { en: "Fatality", fr: "Décès", ar: "وفاة" },
            majorInjury: { en: "Major Injury", fr: "Blessure Grave", ar: "إصابة كبيرة" },
            minorInjury: { en: "Minor Injury", fr: "Blessure Légère", ar: "إصابة طفيفة" },
            illness: { en: "Illness", fr: "Maladie", ar: "مرض" },
            propertyDamage: { en: "Property Damage", fr: "Dommages Matériels", ar: "أضرار مادية" },
            environmentalDamage: { en: "Environmental Damage", fr: "Dommages Environnementaux", ar: "أضرار بيئية" },
            businessInterruption: { en: "Business Interruption", fr: "Interruption d'Activité", ar: "انقطاع الأعمال" },
            reputationalDamage: { en: "Reputational Damage", fr: "Atteinte à la Réputation", ar: "ضرر بالسمعة" },

            // Control Hierarchy
            elimination: { en: "Elimination", fr: "Élimination", ar: "الإزالة" },
            substitution: { en: "Substitution", fr: "Substitution", ar: "الاستبدال" },
            engineeringControls: { en: "Engineering Controls", fr: "Contrôles Techniques", ar: "الضوابط الهندسية" },
            administrativeControls: { en: "Administrative Controls", fr: "Contrôles Administratifs", ar: "الضوابط الإدارية" },
            ppe: { en: "PPE", fr: "EPI", ar: "معدات الحماية الشخصية" }
        },

        // --------------------------------------------------------------------
        // REGULATORY TERMS TRANSLATIONS
        // --------------------------------------------------------------------
        regulatory: {
            riskAssessment: { en: "Risk Assessment", fr: "Évaluation des Risques", ar: "تقييم المخاطر" },
            methodStatement: { en: "Method Statement", fr: "Mode Opératoire", ar: "بيان الطريقة" },
            permitToWork: { en: "Permit to Work", fr: "Permis de Travail", ar: "تصريح العمل" },
            toolboxTalk: { en: "Toolbox Talk", fr: "Causerie Sécurité", ar: "حديث الأمان" },
            safetyDataSheet: { en: "Safety Data Sheet (SDS)", fr: "Fiche de Données de Sécurité (FDS)", ar: "صحيفة بيانات السلامة" },
            nearMiss: { en: "Near Miss", fr: "Presqu'accident", ar: "حادث وشيك" },
            incident: { en: "Incident", fr: "Incident", ar: "حادث" },
            accident: { en: "Accident", fr: "Accident", ar: "حادث" },
            hazardReport: { en: "Hazard Report", fr: "Rapport de Danger", ar: "تقرير الخطر" },
            safetyAudit: { en: "Safety Audit", fr: "Audit de Sécurité", ar: "تدقيق السلامة" },
            inspection: { en: "Inspection", fr: "Inspection", ar: "تفتيش" },
            training: { en: "Training", fr: "Formation", ar: "تدريب" },
            competency: { en: "Competency", fr: "Compétence", ar: "الكفاءة" },
            certification: { en: "Certification", fr: "Certification", ar: "شهادة" }
        },

        // --------------------------------------------------------------------
        // SPECIFIC HAZARDS TRANSLATIONS BY CATEGORY
        // --------------------------------------------------------------------
        hazards: {
            // ================================================================
            // SLIPS, TRIPS & FALLS
            // ================================================================
            SLIP001: { en: "Wet or slippery floors", fr: "Sols mouillés ou glissants", ar: "أرضيات مبللة أو زلقة" },
            SLIP002: { en: "Uneven floor surfaces", fr: "Surfaces de sol irrégulières", ar: "أسطح أرضية غير مستوية" },
            SLIP003: { en: "Trailing cables", fr: "Câbles traînants", ar: "كابلات متدلية" },
            SLIP004: { en: "Loose mats or rugs", fr: "Tapis ou moquettes mal fixés", ar: "سجاد أو حصير غير مثبت" },
            SLIP005: { en: "Poor lighting in walkways", fr: "Mauvais éclairage des allées", ar: "إضاءة ضعيفة في الممرات" },
            SLIP006: { en: "Cluttered walkways/aisles", fr: "Allées encombrées", ar: "ممرات مزدحمة" },
            SLIP007: { en: "Unmarked changes in floor level", fr: "Changements de niveau non signalés", ar: "تغييرات غير محددة في مستوى الأرضية" },
            SLIP008: { en: "Icy or snow-covered surfaces", fr: "Surfaces verglacées ou enneigées", ar: "أسطح جليدية أو مغطاة بالثلج" },
            SLIP009: { en: "Oil or grease spillage", fr: "Déversement d'huile ou de graisse", ar: "انسكاب زيت أو شحم" },
            SLIP010: { en: "Damaged flooring/potholes", fr: "Revêtement de sol endommagé/nids de poule", ar: "أرضيات تالفة/حفر" },
            SLIP011: { en: "Inadequate handrails on stairs", fr: "Rampes d'escalier inadéquates", ar: "درابزين غير كافٍ على السلالم" },
            SLIP012: { en: "Worn stair treads", fr: "Marches d'escalier usées", ar: "درجات سلم بالية" },

            // ================================================================
            // MANUAL HANDLING
            // ================================================================
            MAN001: { en: "Lifting heavy loads", fr: "Levage de charges lourdes", ar: "رفع أحمال ثقيلة" },
            MAN002: { en: "Repetitive lifting", fr: "Levage répétitif", ar: "رفع متكرر" },
            MAN003: { en: "Awkward postures during handling", fr: "Postures inadaptées lors de la manutention", ar: "وضعيات غير مريحة أثناء المناولة" },
            MAN004: { en: "Twisting while carrying loads", fr: "Torsion du corps en portant des charges", ar: "الالتواء أثناء حمل الأحمال" },
            MAN005: { en: "Pushing/pulling heavy objects", fr: "Pousser/tirer des objets lourds", ar: "دفع/سحب أجسام ثقيلة" },
            MAN006: { en: "Carrying loads over long distances", fr: "Port de charges sur de longues distances", ar: "حمل أحمال لمسافات طويلة" },
            MAN007: { en: "Handling loads with poor grip", fr: "Manutention de charges difficiles à saisir", ar: "مناولة أحمال صعبة الإمساك" },
            MAN008: { en: "Handling unstable loads", fr: "Manutention de charges instables", ar: "مناولة أحمال غير مستقرة" },
            MAN009: { en: "Lifting above shoulder height", fr: "Levage au-dessus des épaules", ar: "الرفع فوق مستوى الكتف" },
            MAN010: { en: "Handling in confined spaces", fr: "Manutention en espace confiné", ar: "المناولة في أماكن ضيقة" },
            MAN011: { en: "Team lifting without coordination", fr: "Levage en équipe sans coordination", ar: "رفع جماعي بدون تنسيق" },
            MAN012: { en: "Insufficient rest breaks", fr: "Pauses insuffisantes", ar: "فترات راحة غير كافية" },

            // ================================================================
            // WORKING AT HEIGHT
            // ================================================================
            HGT001: { en: "Falls from ladders", fr: "Chutes depuis des échelles", ar: "السقوط من السلالم" },
            HGT002: { en: "Falls from scaffolding", fr: "Chutes depuis des échafaudages", ar: "السقوط من السقالات" },
            HGT003: { en: "Falls through fragile surfaces", fr: "Chutes à travers des surfaces fragiles", ar: "السقوط عبر أسطح هشة" },
            HGT004: { en: "Falls from roofs", fr: "Chutes depuis des toitures", ar: "السقوط من الأسطح" },
            HGT005: { en: "Falls from MEWPs/cherry pickers", fr: "Chutes depuis des PEMP/nacelles", ar: "السقوط من منصات العمل المتنقلة" },
            HGT006: { en: "Falling objects from height", fr: "Chute d'objets depuis une hauteur", ar: "سقوط أجسام من ارتفاع" },
            HGT007: { en: "Unprotected edges/openings", fr: "Bords/ouvertures non protégés", ar: "حواف/فتحات غير محمية" },
            HGT008: { en: "Overreaching while at height", fr: "Extension excessive en hauteur", ar: "التمدد المفرط أثناء العمل على ارتفاع" },
            HGT009: { en: "Inadequate access equipment", fr: "Équipement d'accès inadéquat", ar: "معدات وصول غير كافية" },
            HGT010: { en: "Unstable working platform", fr: "Plateforme de travail instable", ar: "منصة عمل غير مستقرة" },
            HGT011: { en: "Weather conditions affecting work at height", fr: "Conditions météo affectant le travail en hauteur", ar: "ظروف جوية تؤثر على العمل على ارتفاع" },
            HGT012: { en: "Inadequate edge protection", fr: "Protection de bord inadéquate", ar: "حماية حواف غير كافية" },

            // ================================================================
            // MACHINERY & EQUIPMENT
            // ================================================================
            MCH001: { en: "Contact with moving parts", fr: "Contact avec des pièces en mouvement", ar: "ملامسة أجزاء متحركة" },
            MCH002: { en: "Entanglement in machinery", fr: "Enchevêtrement dans les machines", ar: "التشابك في الآلات" },
            MCH003: { en: "Crushing by machinery", fr: "Écrasement par des machines", ar: "السحق بواسطة الآلات" },
            MCH004: { en: "Ejection of materials", fr: "Éjection de matériaux", ar: "قذف المواد" },
            MCH005: { en: "Hot surfaces", fr: "Surfaces chaudes", ar: "أسطح ساخنة" },
            MCH006: { en: "Sharp edges/cutting points", fr: "Bords tranchants/points de coupe", ar: "حواف حادة/نقاط قطع" },
            MCH007: { en: "Inadequate machine guarding", fr: "Protection des machines inadéquate", ar: "حراسة آلات غير كافية" },
            MCH008: { en: "Unexpected startup", fr: "Démarrage inattendu", ar: "بدء تشغيل غير متوقع" },
            MCH009: { en: "Failure to isolate (LOTO)", fr: "Défaut de consignation (LOTO)", ar: "فشل العزل (لوتو)" },
            MCH010: { en: "Defective equipment", fr: "Équipement défectueux", ar: "معدات معيبة" },
            MCH011: { en: "Improper use of tools", fr: "Utilisation incorrecte des outils", ar: "استخدام غير صحيح للأدوات" },
            MCH012: { en: "Flying debris/particles", fr: "Débris/particules volants", ar: "حطام/جسيمات متطايرة" },

            // ================================================================
            // ELECTRICAL HAZARDS
            // ================================================================
            ELC001: { en: "Contact with live parts", fr: "Contact avec des pièces sous tension", ar: "ملامسة أجزاء حية" },
            ELC002: { en: "Electrical burns", fr: "Brûlures électriques", ar: "حروق كهربائية" },
            ELC003: { en: "Electrical shock", fr: "Choc électrique", ar: "صدمة كهربائية" },
            ELC004: { en: "Arcing/flash over", fr: "Arc électrique/amorçage", ar: "قوس كهربائي/وميض" },
            ELC005: { en: "Damaged cables/wiring", fr: "Câbles/fils endommagés", ar: "كابلات/أسلاك تالفة" },
            ELC006: { en: "Overloaded circuits", fr: "Circuits surchargés", ar: "دوائر محملة بشكل زائد" },
            ELC007: { en: "Wet conditions near electrics", fr: "Conditions humides près d'installations électriques", ar: "ظروف رطبة بالقرب من الكهرباء" },
            ELC008: { en: "Inadequate isolation procedures", fr: "Procédures d'isolation inadéquates", ar: "إجراءات عزل غير كافية" },
            ELC009: { en: "Faulty portable appliances", fr: "Appareils portatifs défectueux", ar: "أجهزة محمولة معيبة" },
            ELC010: { en: "Underground/overhead cables", fr: "Câbles souterrains/aériens", ar: "كابلات تحت الأرض/علوية" },
            ELC011: { en: "Static electricity discharge", fr: "Décharge d'électricité statique", ar: "تفريغ الكهرباء الساكنة" },
            ELC012: { en: "Lightning strikes", fr: "Foudre", ar: "ضربات البرق" },

            // ================================================================
            // FIRE & EXPLOSION
            // ================================================================
            FIR001: { en: "Flammable materials storage", fr: "Stockage de matériaux inflammables", ar: "تخزين مواد قابلة للاشتعال" },
            FIR002: { en: "Ignition sources near flammables", fr: "Sources d'ignition près de matériaux inflammables", ar: "مصادر اشتعال بالقرب من المواد القابلة للاشتعال" },
            FIR003: { en: "Explosive atmospheres (ATEX)", fr: "Atmosphères explosives (ATEX)", ar: "أجواء متفجرة (أتيكس)" },
            FIR004: { en: "Hot work (welding, cutting)", fr: "Travaux par points chauds (soudage, découpe)", ar: "أعمال ساخنة (لحام، قطع)" },
            FIR005: { en: "Electrical fires", fr: "Incendies électriques", ar: "حرائق كهربائية" },
            FIR006: { en: "Blocked fire exits", fr: "Issues de secours bloquées", ar: "مخارج طوارئ مسدودة" },
            FIR007: { en: "Inadequate fire detection", fr: "Détection incendie inadéquate", ar: "كشف حريق غير كافٍ" },
            FIR008: { en: "Lack of firefighting equipment", fr: "Manque d'équipements de lutte contre l'incendie", ar: "نقص معدات مكافحة الحريق" },
            FIR009: { en: "Poor housekeeping (combustibles)", fr: "Mauvais entretien (combustibles)", ar: "سوء التدبير المنزلي (مواد قابلة للاحتراق)" },
            FIR010: { en: "Gas leaks", fr: "Fuites de gaz", ar: "تسرب الغاز" },
            FIR011: { en: "Dust explosion risk", fr: "Risque d'explosion de poussières", ar: "خطر انفجار الغبار" },
            FIR012: { en: "Smoking in restricted areas", fr: "Fumer dans les zones interdites", ar: "التدخين في مناطق محظورة" },

            // ================================================================
            // HAZARDOUS SUBSTANCES (COSHH)
            // ================================================================
            CHM001: { en: "Inhalation of toxic fumes", fr: "Inhalation de vapeurs toxiques", ar: "استنشاق أبخرة سامة" },
            CHM002: { en: "Skin contact with chemicals", fr: "Contact cutané avec des produits chimiques", ar: "ملامسة الجلد للمواد الكيميائية" },
            CHM003: { en: "Eye contact with chemicals", fr: "Contact oculaire avec des produits chimiques", ar: "ملامسة العين للمواد الكيميائية" },
            CHM004: { en: "Ingestion of hazardous substances", fr: "Ingestion de substances dangereuses", ar: "ابتلاع مواد خطرة" },
            CHM005: { en: "Chemical burns", fr: "Brûlures chimiques", ar: "حروق كيميائية" },
            CHM006: { en: "Long-term health effects (carcinogens)", fr: "Effets à long terme sur la santé (cancérogènes)", ar: "آثار صحية طويلة المدى (مسرطنات)" },
            CHM007: { en: "Allergic reactions/sensitizers", fr: "Réactions allergiques/sensibilisants", ar: "تفاعلات حساسية/محسسات" },
            CHM008: { en: "Asphyxiation (oxygen depletion)", fr: "Asphyxie (manque d'oxygène)", ar: "الاختناق (نقص الأكسجين)" },
            CHM009: { en: "Chemical spills", fr: "Déversements chimiques", ar: "انسكابات كيميائية" },
            CHM010: { en: "Incompatible chemical mixing", fr: "Mélange de produits chimiques incompatibles", ar: "خلط مواد كيميائية غير متوافقة" },
            CHM011: { en: "Inadequate ventilation", fr: "Ventilation inadéquate", ar: "تهوية غير كافية" },
            CHM012: { en: "Missing/unclear SDS information", fr: "Informations FDS manquantes/peu claires", ar: "معلومات صحيفة بيانات السلامة مفقودة/غير واضحة" },

            // ================================================================
            // NOISE EXPOSURE
            // ================================================================
            NOI001: { en: "Continuous high noise levels (>85dB)", fr: "Niveaux de bruit élevés continus (>85dB)", ar: "مستويات ضوضاء عالية مستمرة (>85 ديسيبل)" },
            NOI002: { en: "Impact/impulse noise", fr: "Bruit d'impact/impulsionnel", ar: "ضوضاء الصدمات/النبضات" },
            NOI003: { en: "Long-term hearing damage (NIHL)", fr: "Dommages auditifs à long terme", ar: "تلف السمع طويل المدى" },
            NOI004: { en: "Tinnitus risk", fr: "Risque d'acouphènes", ar: "خطر طنين الأذن" },
            NOI005: { en: "Inability to hear warnings", fr: "Incapacité d'entendre les avertissements", ar: "عدم القدرة على سماع التحذيرات" },
            NOI006: { en: "Communication difficulties", fr: "Difficultés de communication", ar: "صعوبات في التواصل" },
            NOI007: { en: "Inadequate hearing protection", fr: "Protection auditive inadéquate", ar: "حماية سمعية غير كافية" },
            NOI008: { en: "Noise from machinery", fr: "Bruit des machines", ar: "ضوضاء الآلات" },

            // ================================================================
            // VIBRATION
            // ================================================================
            VIB001: { en: "Hand-arm vibration (HAVS)", fr: "Vibrations main-bras (HAVS)", ar: "اهتزاز اليد والذراع" },
            VIB002: { en: "Whole-body vibration", fr: "Vibrations corps entier", ar: "اهتزاز الجسم الكامل" },
            VIB003: { en: "Power tool vibration exposure", fr: "Exposition aux vibrations des outils électriques", ar: "التعرض لاهتزازات الأدوات الكهربائية" },
            VIB004: { en: "Vehicle vibration (long-term)", fr: "Vibrations des véhicules (long terme)", ar: "اهتزاز المركبات (طويل المدى)" },
            VIB005: { en: "White finger syndrome risk", fr: "Risque de syndrome du doigt blanc", ar: "خطر متلازمة الإصبع الأبيض" },
            VIB006: { en: "Carpal tunnel syndrome risk", fr: "Risque de syndrome du canal carpien", ar: "خطر متلازمة النفق الرسغي" },

            // ================================================================
            // RADIATION
            // ================================================================
            RAD001: { en: "Ionizing radiation exposure", fr: "Exposition aux rayonnements ionisants", ar: "التعرض للإشعاع المؤين" },
            RAD002: { en: "Non-ionizing radiation (UV, lasers)", fr: "Rayonnements non ionisants (UV, lasers)", ar: "إشعاع غير مؤين (أشعة فوق بنفسجية، ليزر)" },
            RAD003: { en: "Welding arc radiation", fr: "Rayonnement d'arc de soudage", ar: "إشعاع قوس اللحام" },
            RAD004: { en: "X-ray equipment", fr: "Équipement à rayons X", ar: "معدات الأشعة السينية" },
            RAD005: { en: "Radioactive materials", fr: "Matières radioactives", ar: "مواد مشعة" },
            RAD006: { en: "Solar radiation (outdoor work)", fr: "Rayonnement solaire (travail extérieur)", ar: "الإشعاع الشمسي (العمل الخارجي)" },

            // ================================================================
            // CONFINED SPACES
            // ================================================================
            CON001: { en: "Oxygen deficiency", fr: "Déficit en oxygène", ar: "نقص الأكسجين" },
            CON002: { en: "Toxic atmosphere buildup", fr: "Accumulation d'atmosphère toxique", ar: "تراكم جو سام" },
            CON003: { en: "Flammable atmosphere", fr: "Atmosphère inflammable", ar: "جو قابل للاشتعال" },
            CON004: { en: "Engulfment by materials", fr: "Ensevelissement par des matériaux", ar: "الغمر بالمواد" },
            CON005: { en: "Difficulty of rescue", fr: "Difficulté de sauvetage", ar: "صعوبة الإنقاذ" },
            CON006: { en: "Limited entry/exit points", fr: "Points d'entrée/sortie limités", ar: "نقاط دخول/خروج محدودة" },
            CON007: { en: "Temperature extremes", fr: "Températures extrêmes", ar: "درجات حرارة متطرفة" },
            CON008: { en: "Inadequate ventilation", fr: "Ventilation inadéquate", ar: "تهوية غير كافية" },

            // ================================================================
            // WORKPLACE TRANSPORT
            // ================================================================
            TRN001: { en: "Forklift truck incidents", fr: "Incidents de chariots élévateurs", ar: "حوادث الرافعات الشوكية" },
            TRN002: { en: "Pedestrian struck by vehicle", fr: "Piéton heurté par un véhicule", ar: "اصطدام مركبة بمشاة" },
            TRN003: { en: "Vehicle overturning", fr: "Renversement de véhicule", ar: "انقلاب المركبة" },
            TRN004: { en: "Loading/unloading incidents", fr: "Incidents de chargement/déchargement", ar: "حوادث التحميل/التفريغ" },
            TRN005: { en: "Reversing vehicles", fr: "Véhicules en marche arrière", ar: "مركبات تتحرك للخلف" },
            TRN006: { en: "Coupling/uncoupling trailers", fr: "Attelage/dételage de remorques", ar: "ربط/فك المقطورات" },
            TRN007: { en: "Inadequate traffic management", fr: "Gestion du trafic inadéquate", ar: "إدارة حركة مرور غير كافية" },
            TRN008: { en: "Poor visibility/blind spots", fr: "Mauvaise visibilité/angles morts", ar: "ضعف الرؤية/نقاط عمياء" },
            TRN009: { en: "Unsecured loads", fr: "Charges non sécurisées", ar: "أحمال غير مؤمنة" },
            TRN010: { en: "Driving at work (road traffic)", fr: "Conduite au travail (circulation routière)", ar: "القيادة في العمل (حركة المرور)" },

            // ================================================================
            // DISPLAY SCREEN EQUIPMENT
            // ================================================================
            DSE001: { en: "Eye strain/fatigue", fr: "Fatigue oculaire", ar: "إجهاد/تعب العين" },
            DSE002: { en: "Musculoskeletal disorders (MSD)", fr: "Troubles musculo-squelettiques (TMS)", ar: "اضطرابات عضلية هيكلية" },
            DSE003: { en: "Poor workstation setup", fr: "Mauvaise configuration du poste de travail", ar: "إعداد محطة عمل سيء" },
            DSE004: { en: "Prolonged static posture", fr: "Posture statique prolongée", ar: "وضعية ثابتة مطولة" },
            DSE005: { en: "Inadequate lighting/glare", fr: "Éclairage inadéquat/éblouissement", ar: "إضاءة غير كافية/وهج" },
            DSE006: { en: "Repetitive strain injury (RSI)", fr: "Microtraumatismes répétés", ar: "إصابة الإجهاد المتكرر" },

            // ================================================================
            // WORK-RELATED STRESS
            // ================================================================
            STR001: { en: "Excessive workload", fr: "Charge de travail excessive", ar: "عبء عمل مفرط" },
            STR002: { en: "Lack of control over work", fr: "Manque de contrôle sur le travail", ar: "عدم السيطرة على العمل" },
            STR003: { en: "Poor management support", fr: "Mauvais soutien de la direction", ar: "ضعف دعم الإدارة" },
            STR004: { en: "Workplace bullying/harassment", fr: "Harcèlement au travail", ar: "التنمر/المضايقات في مكان العمل" },
            STR005: { en: "Job insecurity", fr: "Insécurité de l'emploi", ar: "عدم الأمان الوظيفي" },
            STR006: { en: "Work-life imbalance", fr: "Déséquilibre vie professionnelle/vie privée", ar: "عدم التوازن بين العمل والحياة" },
            STR007: { en: "Violence and aggression", fr: "Violence et agression", ar: "العنف والعدوان" },
            STR008: { en: "Lone working stress", fr: "Stress du travail isolé", ar: "إجهاد العمل المنفرد" },

            // ================================================================
            // BIOLOGICAL HAZARDS
            // ================================================================
            BIO001: { en: "Blood-borne pathogens", fr: "Agents pathogènes transmissibles par le sang", ar: "مسببات الأمراض المنقولة بالدم" },
            BIO002: { en: "Airborne infections", fr: "Infections aéroportées", ar: "عدوى محمولة جواً" },
            BIO003: { en: "Legionella (water systems)", fr: "Légionelle (systèmes d'eau)", ar: "الليجيونيلا (أنظمة المياه)" },
            BIO004: { en: "Animal-related diseases", fr: "Maladies liées aux animaux", ar: "أمراض مرتبطة بالحيوانات" },
            BIO005: { en: "Mould/fungi exposure", fr: "Exposition aux moisissures/champignons", ar: "التعرض للعفن/الفطريات" },
            BIO006: { en: "Needle stick injuries", fr: "Blessures par piqûre d'aiguille", ar: "إصابات وخز الإبر" },
            BIO007: { en: "Contaminated waste handling", fr: "Manipulation de déchets contaminés", ar: "التعامل مع النفايات الملوثة" },
            BIO008: { en: "Food contamination", fr: "Contamination alimentaire", ar: "تلوث الغذاء" },

            // ================================================================
            // ASBESTOS
            // ================================================================
            ASB001: { en: "Asbestos fiber inhalation", fr: "Inhalation de fibres d'amiante", ar: "استنشاق ألياف الأسبستوس" },
            ASB002: { en: "Disturbing asbestos materials", fr: "Perturbation de matériaux amiantés", ar: "إزعاج مواد الأسبستوس" },
            ASB003: { en: "Unknown asbestos presence", fr: "Présence d'amiante inconnue", ar: "وجود أسبستوس غير معروف" },
            ASB004: { en: "Mesothelioma risk", fr: "Risque de mésothéliome", ar: "خطر ورم الظهارة المتوسطة" },
            ASB005: { en: "Asbestosis risk", fr: "Risque d'asbestose", ar: "خطر داء الأسبستوس" },

            // ================================================================
            // PRESSURE SYSTEMS
            // ================================================================
            PRS001: { en: "Vessel rupture/explosion", fr: "Rupture/explosion de récipient", ar: "انفجار/تمزق الوعاء" },
            PRS002: { en: "Compressed gas cylinder hazards", fr: "Dangers des bouteilles de gaz comprimé", ar: "مخاطر أسطوانات الغاز المضغوط" },
            PRS003: { en: "Steam release", fr: "Libération de vapeur", ar: "إطلاق البخار" },
            PRS004: { en: "Hydraulic system failure", fr: "Défaillance du système hydraulique", ar: "فشل النظام الهيدروليكي" },
            PRS005: { en: "Pneumatic system failure", fr: "Défaillance du système pneumatique", ar: "فشل النظام الهوائي" },
            PRS006: { en: "Overpressurization", fr: "Surpression", ar: "الضغط الزائد" },

            // ================================================================
            // PPE FAILURES
            // ================================================================
            PPE001: { en: "Incorrect PPE selection", fr: "Sélection incorrecte des EPI", ar: "اختيار غير صحيح لمعدات الحماية" },
            PPE002: { en: "Damaged/worn PPE", fr: "EPI endommagés/usés", ar: "معدات حماية تالفة/بالية" },
            PPE003: { en: "Poor PPE fit", fr: "Mauvais ajustement des EPI", ar: "ملاءمة سيئة لمعدات الحماية" },
            PPE004: { en: "Failure to wear PPE", fr: "Non-port des EPI", ar: "عدم ارتداء معدات الحماية" },
            PPE005: { en: "PPE creating additional hazards", fr: "EPI créant des dangers supplémentaires", ar: "معدات حماية تخلق مخاطر إضافية" },
            PPE006: { en: "Inadequate PPE training", fr: "Formation EPI inadéquate", ar: "تدريب غير كافٍ على معدات الحماية" },

            // ================================================================
            // ENVIRONMENTAL CONDITIONS
            // ================================================================
            ENV001: { en: "Extreme heat exposure", fr: "Exposition à la chaleur extrême", ar: "التعرض للحرارة الشديدة" },
            ENV002: { en: "Extreme cold exposure", fr: "Exposition au froid extrême", ar: "التعرض للبرد الشديد" },
            ENV003: { en: "Poor lighting conditions", fr: "Mauvaises conditions d'éclairage", ar: "ظروف إضاءة سيئة" },
            ENV004: { en: "Adverse weather conditions", fr: "Conditions météorologiques défavorables", ar: "ظروف جوية سيئة" },
            ENV005: { en: "Poor air quality", fr: "Mauvaise qualité de l'air", ar: "جودة هواء سيئة" },
            ENV006: { en: "Humidity extremes", fr: "Humidité extrême", ar: "رطوبة متطرفة" },

            // ================================================================
            // ERGONOMIC HAZARDS
            // ================================================================
            ERG001: { en: "Repetitive motions", fr: "Mouvements répétitifs", ar: "حركات متكررة" },
            ERG002: { en: "Awkward body positions", fr: "Positions corporelles inadaptées", ar: "وضعيات جسدية غير مريحة" },
            ERG003: { en: "Forceful exertions", fr: "Efforts intenses", ar: "مجهودات قوية" },
            ERG004: { en: "Contact stress (pressure points)", fr: "Stress de contact (points de pression)", ar: "إجهاد الاتصال (نقاط الضغط)" },
            ERG005: { en: "Prolonged standing", fr: "Station debout prolongée", ar: "الوقوف المطول" },
            ERG006: { en: "Prolonged sitting", fr: "Position assise prolongée", ar: "الجلوس المطول" },

            // ================================================================
            // LOCKOUT/TAGOUT (LOTO) - OSHA
            // ================================================================
            LOTO001: { en: "Unexpected machine startup", fr: "Démarrage inattendu de machine", ar: "بدء تشغيل غير متوقع للآلة" },
            LOTO002: { en: "Failure to de-energize equipment", fr: "Défaut de mise hors tension de l'équipement", ar: "فشل إلغاء تنشيط المعدات" },
            LOTO003: { en: "Inadequate lockout devices", fr: "Dispositifs de consignation inadéquats", ar: "أجهزة قفل غير كافية" },
            LOTO004: { en: "Removal of locks without authorization", fr: "Retrait de cadenas sans autorisation", ar: "إزالة الأقفال بدون تصريح" },
            LOTO005: { en: "Multiple energy sources not isolated", fr: "Sources d'énergie multiples non isolées", ar: "مصادر طاقة متعددة غير معزولة" },
            LOTO006: { en: "Stored/residual energy release", fr: "Libération d'énergie stockée/résiduelle", ar: "إطلاق طاقة مخزنة/متبقية" },
            LOTO007: { en: "Improper group lockout procedures", fr: "Procédures de consignation de groupe incorrectes", ar: "إجراءات قفل جماعي غير صحيحة" },
            LOTO008: { en: "Lack of LOTO training", fr: "Manque de formation LOTO", ar: "نقص التدريب على القفل والعزل" },
            LOTO009: { en: "Shift change without proper lockout transfer", fr: "Changement d'équipe sans transfert de consignation", ar: "تغيير الوردية بدون نقل القفل" },
            LOTO010: { en: "Contractor LOTO coordination failures", fr: "Défaillances de coordination LOTO avec sous-traitants", ar: "فشل تنسيق القفل مع المقاولين" },

            // ================================================================
            // EXCAVATION & TRENCHING - OSHA
            // ================================================================
            EXC001: { en: "Trench collapse/cave-in", fr: "Effondrement de tranchée", ar: "انهيار الخندق" },
            EXC002: { en: "Falls into excavations", fr: "Chutes dans les excavations", ar: "السقوط في الحفريات" },
            EXC003: { en: "Struck by falling materials", fr: "Frappé par des matériaux tombants", ar: "الإصابة بمواد ساقطة" },
            EXC004: { en: "Contact with underground utilities", fr: "Contact avec des réseaux souterrains", ar: "ملامسة المرافق تحت الأرض" },
            EXC005: { en: "Hazardous atmosphere in excavation", fr: "Atmosphère dangereuse dans l'excavation", ar: "جو خطر في الحفرية" },
            EXC006: { en: "Water accumulation/flooding", fr: "Accumulation d'eau/inondation", ar: "تراكم المياه/الفيضان" },
            EXC007: { en: "Inadequate protective systems", fr: "Systèmes de protection inadéquats", ar: "أنظمة حماية غير كافية" },
            EXC008: { en: "Mobile equipment near excavation edge", fr: "Équipement mobile près du bord de l'excavation", ar: "معدات متحركة بالقرب من حافة الحفرية" },
            EXC009: { en: "Insufficient means of egress", fr: "Moyens d'évacuation insuffisants", ar: "وسائل خروج غير كافية" },
            EXC010: { en: "Spoil pile too close to edge", fr: "Tas de déblais trop proche du bord", ar: "كومة الحفر قريبة جداً من الحافة" },

            // ================================================================
            // SCAFFOLDING - OSHA
            // ================================================================
            SCF001: { en: "Scaffold collapse", fr: "Effondrement d'échafaudage", ar: "انهيار السقالة" },
            SCF002: { en: "Falls from scaffold platforms", fr: "Chutes depuis les plateformes d'échafaudage", ar: "السقوط من منصات السقالات" },
            SCF003: { en: "Inadequate guardrails/toeboards", fr: "Garde-corps/plinthes inadéquats", ar: "درابزين/ألواح قدم غير كافية" },
            SCF004: { en: "Scaffold overloading", fr: "Surcharge de l'échafaudage", ar: "تحميل زائد للسقالة" },
            SCF005: { en: "Improper scaffold erection", fr: "Montage incorrect de l'échafaudage", ar: "تركيب سقالة غير صحيح" },
            SCF006: { en: "Unstable scaffold foundation", fr: "Fondation d'échafaudage instable", ar: "أساس سقالة غير مستقر" },
            SCF007: { en: "Scaffold struck by vehicles", fr: "Échafaudage heurté par des véhicules", ar: "اصطدام مركبة بالسقالة" },
            SCF008: { en: "Electrocution from overhead lines", fr: "Électrocution par lignes aériennes", ar: "صعق كهربائي من خطوط علوية" },
            SCF009: { en: "Falling objects from scaffold", fr: "Chute d'objets depuis l'échafaudage", ar: "سقوط أجسام من السقالة" },
            SCF010: { en: "Defective scaffold components", fr: "Composants d'échafaudage défectueux", ar: "مكونات سقالة معيبة" },

            // ================================================================
            // CRANES & RIGGING - OSHA
            // ================================================================
            CRN001: { en: "Crane tip-over", fr: "Renversement de grue", ar: "انقلاب الرافعة" },
            CRN002: { en: "Dropped/falling loads", fr: "Charges lâchées/tombantes", ar: "أحمال ساقطة/متساقطة" },
            CRN003: { en: "Boom/crane contact with power lines", fr: "Contact de la flèche/grue avec les lignes électriques", ar: "ملامسة الذراع/الرافعة لخطوط الكهرباء" },
            CRN004: { en: "Rigging failure", fr: "Défaillance du gréage", ar: "فشل التزوير" },
            CRN005: { en: "Overloading crane capacity", fr: "Dépassement de la capacité de la grue", ar: "تجاوز سعة الرافعة" },
            CRN006: { en: "Swing radius struck-by", fr: "Frappé par le rayon de rotation", ar: "الإصابة بنطاق الدوران" },
            CRN007: { en: "Two-blocking", fr: "Double blocage", ar: "الانسداد المزدوج" },
            CRN008: { en: "Uncontrolled load swing", fr: "Balancement de charge non contrôlé", ar: "تأرجح حمل غير متحكم" },
            CRN009: { en: "Outrigger/ground failure", fr: "Défaillance des stabilisateurs/du sol", ar: "فشل الدعامات/الأرض" },
            CRN010: { en: "Improper load securing", fr: "Arrimage incorrect de la charge", ar: "تأمين حمل غير صحيح" },
            CRN011: { en: "Signal person communication failure", fr: "Défaillance de communication du signaleur", ar: "فشل اتصال المشير" },
            CRN012: { en: "Mechanical/structural crane failure", fr: "Défaillance mécanique/structurelle de la grue", ar: "فشل ميكانيكي/هيكلي للرافعة" },

            // ================================================================
            // WELDING, CUTTING & BRAZING - OSHA
            // ================================================================
            WLD001: { en: "Welding fume inhalation", fr: "Inhalation de fumées de soudage", ar: "استنشاق أدخنة اللحام" },
            WLD002: { en: "Arc eye/flash burn", fr: "Coup d'arc/brûlure par éclair", ar: "عين القوس/حرق الوميض" },
            WLD003: { en: "Burns from hot metal/sparks", fr: "Brûlures par métal chaud/étincelles", ar: "حروق من معدن ساخن/شرر" },
            WLD004: { en: "Fire from welding sparks", fr: "Incendie par étincelles de soudage", ar: "حريق من شرر اللحام" },
            WLD005: { en: "Explosion in confined areas", fr: "Explosion dans des espaces confinés", ar: "انفجار في مناطق محصورة" },
            WLD006: { en: "Electric shock from welding equipment", fr: "Choc électrique de l'équipement de soudage", ar: "صدمة كهربائية من معدات اللحام" },
            WLD007: { en: "Compressed gas cylinder hazards", fr: "Dangers des bouteilles de gaz comprimé", ar: "مخاطر أسطوانات الغاز المضغوط" },
            WLD008: { en: "UV/IR radiation exposure", fr: "Exposition aux rayonnements UV/IR", ar: "التعرض للأشعة فوق البنفسجية/تحت الحمراء" },
            WLD009: { en: "Toxic coating fumes (galvanized, painted)", fr: "Fumées de revêtements toxiques (galvanisé, peint)", ar: "أبخرة طلاء سامة (مجلفن، مطلي)" },
            WLD010: { en: "Oxygen enriched atmosphere fire", fr: "Incendie en atmosphère enrichie en oxygène", ar: "حريق في جو غني بالأكسجين" },

            // ================================================================
            // RESPIRATORY PROTECTION - OSHA
            // ================================================================
            RSP001: { en: "Incorrect respirator selection", fr: "Sélection incorrecte du respirateur", ar: "اختيار غير صحيح لجهاز التنفس" },
            RSP002: { en: "Poor respirator fit", fr: "Mauvais ajustement du respirateur", ar: "ملاءمة سيئة لجهاز التنفس" },
            RSP003: { en: "IDLH atmosphere without proper SCBA", fr: "Atmosphère IDLH sans ARI approprié", ar: "جو خطر على الحياة بدون جهاز تنفس مناسب" },
            RSP004: { en: "Contaminated breathing air supply", fr: "Alimentation en air respiratoire contaminée", ar: "إمداد هواء تنفس ملوث" },
            RSP005: { en: "Respirator cartridge breakthrough", fr: "Percée de la cartouche du respirateur", ar: "اختراق خرطوشة جهاز التنفس" },
            RSP006: { en: "Oxygen deficient atmosphere", fr: "Atmosphère déficiente en oxygène", ar: "جو ناقص الأكسجين" },
            RSP007: { en: "Medical conditions affecting respirator use", fr: "Conditions médicales affectant l'utilisation du respirateur", ar: "حالات طبية تؤثر على استخدام جهاز التنفس" },
            RSP008: { en: "Lack of fit testing", fr: "Manque de test d'ajustement", ar: "نقص اختبار الملاءمة" },

            // ================================================================
            // HAZWOPER - OSHA
            // ================================================================
            HAZ001: { en: "Unknown chemical exposure", fr: "Exposition à des produits chimiques inconnus", ar: "التعرض لمواد كيميائية مجهولة" },
            HAZ002: { en: "Contaminated site entry without proper PPE", fr: "Entrée sur site contaminé sans EPI appropriés", ar: "دخول موقع ملوث بدون معدات حماية مناسبة" },
            HAZ003: { en: "Decontamination failure", fr: "Échec de la décontamination", ar: "فشل إزالة التلوث" },
            HAZ004: { en: "Drum/container rupture", fr: "Rupture de fût/conteneur", ar: "تمزق البرميل/الحاوية" },
            HAZ005: { en: "Incompatible waste mixing", fr: "Mélange de déchets incompatibles", ar: "خلط نفايات غير متوافقة" },
            HAZ006: { en: "Emergency response without training", fr: "Intervention d'urgence sans formation", ar: "استجابة طوارئ بدون تدريب" },
            HAZ007: { en: "Heat stress in protective equipment", fr: "Stress thermique en équipement de protection", ar: "إجهاد حراري في معدات الحماية" },
            HAZ008: { en: "Secondary contamination spread", fr: "Propagation de contamination secondaire", ar: "انتشار التلوث الثانوي" },

            // ================================================================
            // PROCESS SAFETY MANAGEMENT - OSHA
            // ================================================================
            PSM001: { en: "Process deviation/upset", fr: "Déviation/perturbation du procédé", ar: "انحراف/اضطراب العملية" },
            PSM002: { en: "Mechanical integrity failure", fr: "Défaillance de l'intégrité mécanique", ar: "فشل السلامة الميكانيكية" },
            PSM003: { en: "Management of change (MOC) bypass", fr: "Contournement de la gestion du changement (MOC)", ar: "تجاوز إدارة التغيير" },
            PSM004: { en: "Operating procedure deviation", fr: "Déviation des procédures opérationnelles", ar: "انحراف إجراءات التشغيل" },
            PSM005: { en: "Safety instrumented system failure", fr: "Défaillance du système instrumenté de sécurité", ar: "فشل نظام السلامة المزود بالأجهزة" },
            PSM006: { en: "Pre-startup safety review missed", fr: "Revue de sécurité pré-démarrage manquée", ar: "تفويت مراجعة السلامة قبل التشغيل" },
            PSM007: { en: "Contractor safety interface failures", fr: "Défaillances d'interface sécurité sous-traitants", ar: "فشل واجهة سلامة المقاولين" },
            PSM008: { en: "Emergency response inadequate", fr: "Réponse d'urgence inadéquate", ar: "استجابة طوارئ غير كافية" },

            // ================================================================
            // AIRCRAFT OPERATIONS - IATA
            // ================================================================
            AIR001: { en: "Aircraft ground damage (hangar rash)", fr: "Dommages au sol de l'aéronef", ar: "أضرار أرضية للطائرة" },
            AIR002: { en: "Jet engine ingestion", fr: "Ingestion par moteur à réaction", ar: "ابتلاع المحرك النفاث" },
            AIR003: { en: "Propeller strike", fr: "Frappe d'hélice", ar: "ضربة المروحة" },
            AIR004: { en: "Aircraft door operation injuries", fr: "Blessures lors de l'opération des portes d'aéronef", ar: "إصابات تشغيل باب الطائرة" },
            AIR005: { en: "Wing/tail strike during towing", fr: "Frappe d'aile/queue pendant le remorquage", ar: "ضربة الجناح/الذيل أثناء السحب" },
            AIR006: { en: "Pushback/towing incidents", fr: "Incidents de repoussage/remorquage", ar: "حوادث الدفع للخلف/السحب" },
            AIR007: { en: "Collision with ground equipment", fr: "Collision avec l'équipement au sol", ar: "اصطدام بمعدات أرضية" },
            AIR008: { en: "Incorrect aircraft configuration", fr: "Configuration incorrecte de l'aéronef", ar: "تكوين طائرة غير صحيح" },
            AIR009: { en: "Hydraulic system hazards", fr: "Dangers du système hydraulique", ar: "مخاطر النظام الهيدروليكي" },
            AIR010: { en: "APU exhaust exposure", fr: "Exposition aux gaz d'échappement de l'APU", ar: "التعرض لعادم وحدة الطاقة المساعدة" },

            // ================================================================
            // RAMP / GROUND OPERATIONS - IATA
            // ================================================================
            RMP001: { en: "Struck by ground support equipment", fr: "Frappé par l'équipement de soutien au sol", ar: "الإصابة بمعدات الدعم الأرضي" },
            RMP002: { en: "GSE collision with aircraft", fr: "Collision GSE avec l'aéronef", ar: "اصطدام معدات الدعم بالطائرة" },
            RMP003: { en: "Baggage/cargo handling injuries", fr: "Blessures lors de la manutention des bagages/fret", ar: "إصابات مناولة الأمتعة/البضائع" },
            RMP004: { en: "Falls from aircraft holds/doors", fr: "Chutes depuis les soutes/portes d'aéronef", ar: "السقوط من عنابر/أبواب الطائرة" },
            RMP005: { en: "Passenger boarding bridge incidents", fr: "Incidents de passerelle d'embarquement", ar: "حوادث جسر صعود الركاب" },
            RMP006: { en: "Catering vehicle incidents", fr: "Incidents de véhicules de restauration", ar: "حوادث مركبات التموين" },
            RMP007: { en: "Belt loader entanglement", fr: "Enchevêtrement dans le chargeur à bande", ar: "التشابك في محمل الحزام" },
            RMP008: { en: "Night operations visibility", fr: "Visibilité des opérations de nuit", ar: "رؤية العمليات الليلية" },
            RMP009: { en: "Adverse weather on ramp", fr: "Intempéries sur le tarmac", ar: "طقس سيئ على المنحدر" },
            RMP010: { en: "Runway/taxiway incursion", fr: "Incursion sur piste/voie de circulation", ar: "اقتحام المدرج/ممر التاكسي" },

            // ================================================================
            // JET BLAST & PROPELLER WASH
            // ================================================================
            JET001: { en: "Personnel blown over by jet blast", fr: "Personnel renversé par le souffle réacteur", ar: "سقوط الأفراد بسبب انفجار المحرك" },
            JET002: { en: "Equipment blown into personnel/aircraft", fr: "Équipement projeté sur le personnel/aéronef", ar: "معدات منفوخة نحو الأفراد/الطائرة" },
            JET003: { en: "Debris propelled by jet exhaust", fr: "Débris projetés par l'échappement du réacteur", ar: "حطام مدفوع بعادم المحرك" },
            JET004: { en: "Propeller wash knockdown", fr: "Renversement par le souffle d'hélice", ar: "السقوط بسبب غسيل المروحة" },
            JET005: { en: "Hearing damage from jet noise", fr: "Dommages auditifs dus au bruit des réacteurs", ar: "تلف السمع من ضوضاء المحرك" },
            JET006: { en: "Thermal injuries from exhaust", fr: "Brûlures thermiques par l'échappement", ar: "إصابات حرارية من العادم" },

            // ================================================================
            // AIRCRAFT FUELING - IATA
            // ================================================================
            FUL001: { en: "Fuel spill/overfill", fr: "Déversement/débordement de carburant", ar: "انسكاب/فيض الوقود" },
            FUL002: { en: "Static electricity ignition", fr: "Ignition par électricité statique", ar: "اشتعال الكهرباء الساكنة" },
            FUL003: { en: "Fuel vapor inhalation", fr: "Inhalation de vapeurs de carburant", ar: "استنشاق أبخرة الوقود" },
            FUL004: { en: "Fuel fire/explosion", fr: "Incendie/explosion de carburant", ar: "حريق/انفجار الوقود" },
            FUL005: { en: "Fuel contamination", fr: "Contamination du carburant", ar: "تلوث الوقود" },
            FUL006: { en: "Fuel tanker collision", fr: "Collision de camion-citerne", ar: "اصطدام ناقلة الوقود" },
            FUL007: { en: "Bonding/grounding failure", fr: "Défaillance de mise à la terre", ar: "فشل التأريض/الربط" },
            FUL008: { en: "Deadman control failure", fr: "Défaillance du contrôle homme-mort", ar: "فشل التحكم بالرجل الميت" },
            FUL009: { en: "Fuel hose strikes", fr: "Frappes de tuyau de carburant", ar: "ضربات خرطوم الوقود" },
            FUL010: { en: "Hot fueling risks", fr: "Risques d'avitaillement à chaud", ar: "مخاطر التزود بالوقود الساخن" },

            // ================================================================
            // CARGO & ULD HANDLING
            // ================================================================
            CRG001: { en: "ULD crushing/trapping", fr: "Écrasement/piégeage par ULD", ar: "سحق/حصر بحاويات الشحن" },
            CRG002: { en: "Unsecured cargo shift", fr: "Déplacement de fret non sécurisé", ar: "انزلاق بضائع غير مؤمنة" },
            CRG003: { en: "Cargo loader falls", fr: "Chutes depuis le chargeur de fret", ar: "السقوط من محمل البضائع" },
            CRG004: { en: "Manual handling of heavy items", fr: "Manutention manuelle d'objets lourds", ar: "مناولة يدوية لأجسام ثقيلة" },
            CRG005: { en: "Cargo door operation injuries", fr: "Blessures lors de l'opération des portes de fret", ar: "إصابات تشغيل باب البضائع" },
            CRG006: { en: "Cargo net/strap failures", fr: "Défaillance de filet/sangle de fret", ar: "فشل شبكة/حزام البضائع" },
            CRG007: { en: "Conveyor entanglement", fr: "Enchevêtrement dans le convoyeur", ar: "التشابك في الناقل" },
            CRG008: { en: "Overloaded cargo positions", fr: "Positions de fret surchargées", ar: "مواقع بضائع محملة بشكل زائد" },

            // ================================================================
            // DE-ICING / ANTI-ICING
            // ================================================================
            DEI001: { en: "De-icing fluid exposure (skin/eyes)", fr: "Exposition au liquide de dégivrage (peau/yeux)", ar: "التعرض لسائل إزالة الجليد (الجلد/العيون)" },
            DEI002: { en: "De-icing truck tip-over", fr: "Renversement du camion de dégivrage", ar: "انقلاب شاحنة إزالة الجليد" },
            DEI003: { en: "Falls from de-icing platforms", fr: "Chutes depuis les plateformes de dégivrage", ar: "السقوط من منصات إزالة الجليد" },
            DEI004: { en: "Slippery conditions around aircraft", fr: "Conditions glissantes autour de l'aéronef", ar: "ظروف زلقة حول الطائرة" },
            DEI005: { en: "Cold stress during de-icing ops", fr: "Stress thermique au froid pendant le dégivrage", ar: "إجهاد البرد أثناء عمليات إزالة الجليد" },
            DEI006: { en: "Aircraft surface damage from de-icing", fr: "Dommages de surface d'aéronef par le dégivrage", ar: "تلف سطح الطائرة من إزالة الجليد" },
            DEI007: { en: "Glycol fluid ingestion/aspiration", fr: "Ingestion/aspiration de fluide glycol", ar: "ابتلاع/استنشاق سائل الجليكول" },

            // ================================================================
            // FOREIGN OBJECT DEBRIS (FOD)
            // ================================================================
            FOD001: { en: "FOD ingestion into engine", fr: "Ingestion de FOD dans le moteur", ar: "ابتلاع المحرك للحطام الغريب" },
            FOD002: { en: "Tire damage from FOD", fr: "Dommages aux pneus par FOD", ar: "تلف الإطارات من الحطام" },
            FOD003: { en: "FOD strike to personnel", fr: "Frappe de FOD sur le personnel", ar: "إصابة الأفراد بالحطام" },
            FOD004: { en: "Tools left in aircraft", fr: "Outils oubliés dans l'aéronef", ar: "أدوات متروكة في الطائرة" },
            FOD005: { en: "Loose fasteners/hardware", fr: "Fixations/quincaillerie desserrées", ar: "مثبتات/معدات فضفاضة" },
            FOD006: { en: "Debris blown by aircraft operations", fr: "Débris soufflés par les opérations aériennes", ar: "حطام منفوخ بعمليات الطائرات" },

            // ================================================================
            // DANGEROUS GOODS (DG) - IATA
            // ================================================================
            DGD001: { en: "Undeclared dangerous goods", fr: "Marchandises dangereuses non déclarées", ar: "بضائع خطرة غير معلنة" },
            DGD002: { en: "Improper DG packaging", fr: "Emballage incorrect de marchandises dangereuses", ar: "تغليف غير صحيح للبضائع الخطرة" },
            DGD003: { en: "DG leakage/spillage", fr: "Fuite/déversement de marchandises dangereuses", ar: "تسرب/انسكاب البضائع الخطرة" },
            DGD004: { en: "Incompatible DG loading", fr: "Chargement incompatible de marchandises dangereuses", ar: "تحميل بضائع خطرة غير متوافقة" },
            DGD005: { en: "Lithium battery thermal runaway", fr: "Emballement thermique de batterie lithium", ar: "انفلات حراري لبطارية الليثيوم" },
            DGD006: { en: "Radioactive material exposure", fr: "Exposition à des matières radioactives", ar: "التعرض لمواد مشعة" },
            DGD007: { en: "Infectious substance exposure", fr: "Exposition à des substances infectieuses", ar: "التعرض لمواد معدية" },
            DGD008: { en: "Corrosive material burns", fr: "Brûlures par matières corrosives", ar: "حروق مواد أكالة" },
            DGD009: { en: "Toxic gas release", fr: "Libération de gaz toxiques", ar: "إطلاق غاز سام" },
            DGD010: { en: "Oxidizer reaction with combustibles", fr: "Réaction d'oxydant avec combustibles", ar: "تفاعل المؤكسد مع المواد القابلة للاحتراق" },

            // ================================================================
            // CABIN SAFETY
            // ================================================================
            CAB001: { en: "Passenger turbulence injuries", fr: "Blessures de passagers par turbulences", ar: "إصابات الركاب من الاضطرابات الجوية" },
            CAB002: { en: "Galley equipment burns", fr: "Brûlures par équipement de cuisine", ar: "حروق معدات المطبخ" },
            CAB003: { en: "Overhead bin falling objects", fr: "Chute d'objets des compartiments supérieurs", ar: "سقوط أجسام من الصناديق العلوية" },
            CAB004: { en: "Emergency exit operation injuries", fr: "Blessures lors de l'opération des issues de secours", ar: "إصابات تشغيل مخارج الطوارئ" },
            CAB005: { en: "Smoke/fumes in cabin", fr: "Fumée/vapeurs en cabine", ar: "دخان/أبخرة في المقصورة" },
            CAB006: { en: "Slip/trip in cabin/galley", fr: "Glissade/trébuchement en cabine/cuisine", ar: "انزلاق/تعثر في المقصورة/المطبخ" },
            CAB007: { en: "Aggressive passenger incidents", fr: "Incidents de passagers agressifs", ar: "حوادث ركاب عدوانيين" },
            CAB008: { en: "Medical emergencies", fr: "Urgences médicales", ar: "حالات طوارئ طبية" },

            // ================================================================
            // BIRD & WILDLIFE STRIKES
            // ================================================================
            BRD001: { en: "Bird strike to engines", fr: "Impact d'oiseau sur les moteurs", ar: "اصطدام طائر بالمحركات" },
            BRD002: { en: "Bird strike to windscreen", fr: "Impact d'oiseau sur le pare-brise", ar: "اصطدام طائر بالزجاج الأمامي" },
            BRD003: { en: "Wildlife on runway", fr: "Faune sur la piste", ar: "حياة برية على المدرج" },
            BRD004: { en: "Bird strike during takeoff/landing", fr: "Impact d'oiseau pendant le décollage/atterrissage", ar: "اصطدام طائر أثناء الإقلاع/الهبوط" },
            BRD005: { en: "Multiple bird ingestion", fr: "Ingestion d'oiseaux multiples", ar: "ابتلاع طيور متعددة" },

            // ================================================================
            // DRILLING OPERATIONS - API
            // ================================================================
            DRL001: { en: "Drill string failure", fr: "Défaillance du train de forage", ar: "فشل سلسلة الحفر" },
            DRL002: { en: "Rotary table/kelly bushing hazards", fr: "Dangers de la table rotative/douille kelly", ar: "مخاطر الطاولة الدوارة/جلبة كيلي" },
            DRL003: { en: "Pipe handling/makeup injuries", fr: "Blessures de manutention/vissage de tubes", ar: "إصابات مناولة/تركيب الأنابيب" },
            DRL004: { en: "Stuck pipe/fishing operations", fr: "Tube coincé/opérations de repêchage", ar: "أنبوب عالق/عمليات الصيد" },
            DRL005: { en: "Mud system hazards", fr: "Dangers du système de boue", ar: "مخاطر نظام الطين" },
            DRL006: { en: "Derrick/mast climbing falls", fr: "Chutes d'escalade du derrick/mât", ar: "سقوط من تسلق البرج/الصاري" },
            DRL007: { en: "Crown/traveling block hazards", fr: "Dangers du moufle fixe/mobile", ar: "مخاطر البكرة الثابتة/المتحركة" },
            DRL008: { en: "Shale shaker hazards", fr: "Dangers du tamis vibrant", ar: "مخاطر هزاز الصخر الزيتي" },
            DRL009: { en: "Casing running operations", fr: "Opérations de descente de tubage", ar: "عمليات إنزال أنابيب التغليف" },
            DRL010: { en: "Top drive system failures", fr: "Défaillances du système top drive", ar: "أعطال نظام المحرك العلوي" },

            // ================================================================
            // HYDROGEN SULFIDE (H2S) - API
            // ================================================================
            H2S001: { en: "H2S gas release", fr: "Libération de gaz H2S", ar: "إطلاق غاز كبريتيد الهيدروجين" },
            H2S002: { en: "H2S exposure - immediate incapacitation", fr: "Exposition H2S - incapacité immédiate", ar: "التعرض لـ H2S - عجز فوري" },
            H2S003: { en: "H2S detector failure", fr: "Défaillance du détecteur H2S", ar: "فشل كاشف H2S" },
            H2S004: { en: "Inadequate wind sock monitoring", fr: "Surveillance inadéquate de la manche à air", ar: "مراقبة غير كافية لكم الرياح" },
            H2S005: { en: "SCBA not available/functional", fr: "ARI non disponible/fonctionnel", ar: "جهاز التنفس غير متاح/يعمل" },
            H2S006: { en: "Muster point in downwind location", fr: "Point de rassemblement sous le vent", ar: "نقطة تجمع في اتجاه الريح" },
            H2S007: { en: "H2S in confined space", fr: "H2S en espace confiné", ar: "H2S في مكان محصور" },
            H2S008: { en: "Rescue attempt without protection", fr: "Tentative de sauvetage sans protection", ar: "محاولة إنقاذ بدون حماية" },

            // ================================================================
            // WELL CONTROL / BLOWOUT PREVENTION - API
            // ================================================================
            BOP001: { en: "Kick/well influx", fr: "Venue/afflux de puits", ar: "ركلة/تدفق البئر" },
            BOP002: { en: "Blowout preventer (BOP) failure", fr: "Défaillance du BOP", ar: "فشل مانع الانفجار" },
            BOP003: { en: "Uncontrolled well flow", fr: "Écoulement de puits non contrôlé", ar: "تدفق بئر غير متحكم" },
            BOP004: { en: "Underground blowout", fr: "Éruption souterraine", ar: "انفجار تحت الأرض" },
            BOP005: { en: "Gas migration to surface", fr: "Migration de gaz vers la surface", ar: "هجرة الغاز إلى السطح" },
            BOP006: { en: "Inadequate mud weight", fr: "Poids de boue inadéquat", ar: "وزن طين غير كافٍ" },
            BOP007: { en: "Lost circulation", fr: "Perte de circulation", ar: "فقدان الدورة" },
            BOP008: { en: "Pressure buildup in annulus", fr: "Accumulation de pression dans l'annulaire", ar: "تراكم الضغط في الحلقة" },

            // ================================================================
            // PIPELINE OPERATIONS - API
            // ================================================================
            PIP001: { en: "Pipeline rupture", fr: "Rupture de pipeline", ar: "تمزق خط الأنابيب" },
            PIP002: { en: "Third-party damage (excavation)", fr: "Dommages par tiers (excavation)", ar: "أضرار طرف ثالث (حفر)" },
            PIP003: { en: "Corrosion failure", fr: "Défaillance par corrosion", ar: "فشل بسبب التآكل" },
            PIP004: { en: "Pig launching/receiving hazards", fr: "Dangers de lancement/réception de racleur", ar: "مخاطر إطلاق/استقبال الخنزير" },
            PIP005: { en: "High pressure testing incidents", fr: "Incidents de test haute pression", ar: "حوادث اختبار الضغط العالي" },
            PIP006: { en: "Pipeline crossing hazards", fr: "Dangers de traversée de pipeline", ar: "مخاطر عبور خط الأنابيب" },
            PIP007: { en: "Vapor cloud from leak", fr: "Nuage de vapeur suite à une fuite", ar: "سحابة بخار من التسرب" },
            PIP008: { en: "Pipeline fire/explosion", fr: "Incendie/explosion de pipeline", ar: "حريق/انفجار خط الأنابيب" },

            // ================================================================
            // OFFSHORE OPERATIONS - API
            // ================================================================
            OFF001: { en: "Helicopter operations accidents", fr: "Accidents d'opérations héliportées", ar: "حوادث عمليات المروحيات" },
            OFF002: { en: "Man overboard", fr: "Homme à la mer", ar: "سقوط شخص في البحر" },
            OFF003: { en: "Personnel transfer (swing rope/basket)", fr: "Transfert de personnel (corde/nacelle)", ar: "نقل الأفراد (حبل/سلة)" },
            OFF004: { en: "Platform structural failure", fr: "Défaillance structurelle de la plateforme", ar: "فشل هيكلي للمنصة" },
            OFF005: { en: "Supply vessel collision", fr: "Collision de navire ravitailleur", ar: "اصطدام سفينة الإمداد" },
            OFF006: { en: "Lifeboat drill injuries", fr: "Blessures lors d'exercices canot de sauvetage", ar: "إصابات تدريب قارب النجاة" },
            OFF007: { en: "Crane operations over water", fr: "Opérations de grue au-dessus de l'eau", ar: "عمليات الرافعة فوق الماء" },
            OFF008: { en: "Extreme weather/evacuation", fr: "Météo extrême/évacuation", ar: "طقس شديد/إخلاء" },
            OFF009: { en: "Platform fire", fr: "Incendie de plateforme", ar: "حريق المنصة" },
            OFF010: { en: "Toxic gas accumulation in modules", fr: "Accumulation de gaz toxique dans les modules", ar: "تراكم غاز سام في الوحدات" },

            // ================================================================
            // HYDROCARBON RELEASE
            // ================================================================
            HYD001: { en: "Flange/gasket leak", fr: "Fuite de bride/joint", ar: "تسرب الفلنجة/الحشية" },
            HYD002: { en: "Process vessel rupture", fr: "Rupture de récipient de procédé", ar: "تمزق وعاء العملية" },
            HYD003: { en: "Tank overfill", fr: "Débordement de réservoir", ar: "فيض الخزان" },
            HYD004: { en: "Loading/unloading spills", fr: "Déversements de chargement/déchargement", ar: "انسكابات التحميل/التفريغ" },
            HYD005: { en: "Vapor cloud explosion (VCE)", fr: "Explosion de nuage de vapeur", ar: "انفجار سحابة بخار" },
            HYD006: { en: "Pool fire", fr: "Feu de nappe", ar: "حريق البركة" },
            HYD007: { en: "Jet fire", fr: "Feu de jet", ar: "حريق نفاث" },
            HYD008: { en: "BLEVE (boiling liquid expanding vapor)", fr: "BLEVE (explosion de vapeur en expansion)", ar: "انفجار السائل المغلي المتمدد" },

            // ================================================================
            // LIFTING OPERATIONS - IOGP
            // ================================================================
            LFT001: { en: "Dropped object from crane", fr: "Objet tombé de la grue", ar: "سقوط جسم من الرافعة" },
            LFT002: { en: "Personnel under suspended load", fr: "Personnel sous charge suspendue", ar: "أفراد تحت حمل معلق" },
            LFT003: { en: "Rigging failure", fr: "Défaillance du gréage", ar: "فشل التزوير" },
            LFT004: { en: "Crane overloading", fr: "Surcharge de la grue", ar: "تحميل زائد للرافعة" },
            LFT005: { en: "Uncontrolled load movement", fr: "Mouvement de charge non contrôlé", ar: "حركة حمل غير متحكم" },
            LFT006: { en: "Banksman/signaler struck", fr: "Signaleur frappé", ar: "إصابة المشير" },
            LFT007: { en: "Forklift overturning", fr: "Renversement de chariot élévateur", ar: "انقلاب الرافعة الشوكية" },
            LFT008: { en: "Manual handling during lift setup", fr: "Manutention manuelle lors de la préparation du levage", ar: "مناولة يدوية أثناء إعداد الرفع" },

            // ================================================================
            // COMMERCIAL DIVING - API
            // ================================================================
            DIV001: { en: "Decompression sickness (the bends)", fr: "Maladie de décompression", ar: "مرض تخفيف الضغط (الانحناءات)" },
            DIV002: { en: "Breathing gas supply failure", fr: "Défaillance de l'alimentation en gaz respiratoire", ar: "فشل إمداد غاز التنفس" },
            DIV003: { en: "Diver entanglement", fr: "Enchevêtrement du plongeur", ar: "تشابك الغواص" },
            DIV004: { en: "Hypothermia", fr: "Hypothermie", ar: "انخفاض حرارة الجسم" },
            DIV005: { en: "Diving bell failure", fr: "Défaillance de la cloche de plongée", ar: "فشل جرس الغوص" },
            DIV006: { en: "Diver struck by vessel/equipment", fr: "Plongeur frappé par navire/équipement", ar: "إصابة الغواص بسفينة/معدات" },
            DIV007: { en: "Lost communication with surface", fr: "Perte de communication avec la surface", ar: "فقدان الاتصال مع السطح" },
            DIV008: { en: "Nitrogen narcosis", fr: "Narcose à l'azote", ar: "تخدير النيتروجين" },
            DIV009: { en: "High pressure nervous syndrome", fr: "Syndrome nerveux des hautes pressions", ar: "متلازمة الضغط العالي العصبية" },

            // ================================================================
            // HOT WORK OPERATIONS - IOGP
            // ================================================================
            HOT001: { en: "Fire from hot work sparks", fr: "Incendie par étincelles de travaux par points chauds", ar: "حريق من شرر الأعمال الساخنة" },
            HOT002: { en: "Explosion in hazardous area", fr: "Explosion en zone dangereuse", ar: "انفجار في منطقة خطرة" },
            HOT003: { en: "Inadequate fire watch", fr: "Surveillance incendie inadéquate", ar: "مراقبة حريق غير كافية" },
            HOT004: { en: "Welding on pressurized equipment", fr: "Soudage sur équipement sous pression", ar: "لحام على معدات مضغوطة" },
            HOT005: { en: "Hot work permit violations", fr: "Violations de permis de travail par points chauds", ar: "انتهاكات تصريح العمل الساخن" },
            HOT006: { en: "Residual hydrocarbons ignition", fr: "Ignition d'hydrocarbures résiduels", ar: "اشتعال هيدروكربونات متبقية" },
            HOT007: { en: "Cutting into unknown piping", fr: "Découpe de tuyauterie inconnue", ar: "قطع في أنابيب مجهولة" },
            HOT008: { en: "Smoldering fire after work completion", fr: "Feu couvant après fin des travaux", ar: "حريق متقد بعد انتهاء العمل" },

            // ================================================================
            // SIMULTANEOUS OPERATIONS (SIMOPS)
            // ================================================================
            SIM001: { en: "Drilling during production operations", fr: "Forage pendant les opérations de production", ar: "الحفر أثناء عمليات الإنتاج" },
            SIM002: { en: "Construction near live systems", fr: "Construction près de systèmes actifs", ar: "البناء بالقرب من أنظمة حية" },
            SIM003: { en: "Multiple crane operations", fr: "Opérations de grues multiples", ar: "عمليات رافعات متعددة" },
            SIM004: { en: "Marine/helicopter ops conflict", fr: "Conflit opérations marines/héliportées", ar: "تعارض عمليات بحرية/مروحية" },
            SIM005: { en: "Hot work during hazardous operations", fr: "Travaux par points chauds pendant opérations dangereuses", ar: "أعمال ساخنة أثناء عمليات خطرة" },
            SIM006: { en: "Inadequate communication between teams", fr: "Communication inadéquate entre équipes", ar: "اتصال غير كافٍ بين الفرق" },
            SIM007: { en: "Unplanned interface between activities", fr: "Interface non planifiée entre activités", ar: "واجهة غير مخططة بين الأنشطة" },
            SIM008: { en: "Emergency response confusion during SIMOPS", fr: "Confusion de réponse d'urgence pendant SIMOPS", ar: "ارتباك الاستجابة للطوارئ أثناء العمليات المتزامنة" }
        },

        // --------------------------------------------------------------------
        // CONTROL MEASURES TRANSLATIONS (Selected Key Controls)
        // --------------------------------------------------------------------
        controls: {
            // General Controls
            eliminateHazard: { en: "Eliminate the hazard", fr: "Éliminer le danger", ar: "إزالة الخطر" },
            substituteWithSafer: { en: "Substitute with safer alternative", fr: "Substituer par une alternative plus sûre", ar: "استبدال ببديل أكثر أماناً" },
            engineeringControl: { en: "Install engineering controls", fr: "Installer des contrôles techniques", ar: "تركيب ضوابط هندسية" },
            adminControl: { en: "Implement administrative controls", fr: "Mettre en place des contrôles administratifs", ar: "تطبيق ضوابط إدارية" },
            usePPE: { en: "Use appropriate PPE", fr: "Utiliser les EPI appropriés", ar: "استخدام معدات الحماية المناسبة" },
            provideTraining: { en: "Provide training", fr: "Fournir une formation", ar: "توفير التدريب" },
            conductInspection: { en: "Conduct regular inspections", fr: "Effectuer des inspections régulières", ar: "إجراء فحوصات منتظمة" },
            implementProcedure: { en: "Implement safe work procedure", fr: "Mettre en œuvre une procédure de travail sécuritaire", ar: "تطبيق إجراء عمل آمن" },
            installGuarding: { en: "Install guarding/barriers", fr: "Installer des protections/barrières", ar: "تركيب حواجز/حماية" },
            provideSignage: { en: "Provide warning signs", fr: "Installer des panneaux d'avertissement", ar: "توفير لافتات تحذيرية" },
            maintainEquipment: { en: "Maintain equipment regularly", fr: "Entretenir l'équipement régulièrement", ar: "صيانة المعدات بانتظام" },
            permitToWork: { en: "Implement permit to work system", fr: "Mettre en place un système de permis de travail", ar: "تطبيق نظام تصريح العمل" },
            emergencyProcedure: { en: "Establish emergency procedures", fr: "Établir des procédures d'urgence", ar: "وضع إجراءات الطوارئ" },
            riskAssessment: { en: "Conduct risk assessment", fr: "Effectuer une évaluation des risques", ar: "إجراء تقييم المخاطر" },
            healthSurveillance: { en: "Implement health surveillance", fr: "Mettre en place une surveillance médicale", ar: "تطبيق المراقبة الصحية" },
            
            // Specific Industry Controls
            lockoutTagout: { en: "Apply lockout/tagout procedures", fr: "Appliquer les procédures de consignation/déconsignation", ar: "تطبيق إجراءات القفل/العزل" },
            fallProtection: { en: "Use fall protection equipment", fr: "Utiliser un équipement de protection contre les chutes", ar: "استخدام معدات الحماية من السقوط" },
            confinedSpaceEntry: { en: "Follow confined space entry procedures", fr: "Suivre les procédures d'entrée en espace confiné", ar: "اتباع إجراءات دخول الأماكن المحصورة" },
            gasDetection: { en: "Use gas detection equipment", fr: "Utiliser un équipement de détection de gaz", ar: "استخدام معدات كشف الغاز" },
            hotWorkPermit: { en: "Obtain hot work permit", fr: "Obtenir un permis de travail par points chauds", ar: "الحصول على تصريح العمل الساخن" },
            liftPlan: { en: "Develop lift plan", fr: "Élaborer un plan de levage", ar: "وضع خطة الرفع" },
            trafficManagement: { en: "Implement traffic management plan", fr: "Mettre en place un plan de gestion du trafic", ar: "تطبيق خطة إدارة المرور" },
            spillResponse: { en: "Have spill response equipment ready", fr: "Avoir l'équipement d'intervention en cas de déversement prêt", ar: "تجهيز معدات الاستجابة للانسكاب" }
        }
    }
};

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HSE_HAZARD_REGISTRY;
}
if (typeof window !== 'undefined') {
    window.HSE_HAZARD_REGISTRY = HSE_HAZARD_REGISTRY;
}
