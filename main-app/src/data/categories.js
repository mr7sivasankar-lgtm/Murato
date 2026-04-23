// ─────────────────────────────────────────────
//  PRODUCT CATEGORIES
// ─────────────────────────────────────────────
export const PRODUCT_CATEGORIES = [
  {
    name: 'Cement',
    img: '/categories/Cement.png',
    subcategories: [
      { name: 'OPC Cement', types: ['43 Grade', '53 Grade', 'PPC Blend'] },
      { name: 'PPC Cement', types: [] },
      { name: 'White Cement', types: [] },
      { name: 'Rapid Hardening', types: [] },
    ],
    brands: ['UltraTech', 'ACC', 'Ambuja', 'Dalmia', 'Shree', 'JK Cement', 'Ramco', 'India Cements'],
    units: ['bag', 'ton'],
    priceTypes: ['per_bag', 'per_ton'],
  },
  {
    name: 'Steel',
    img: '/categories/Steel.png',
    subcategories: [
      { name: 'TMT Bars', types: ['Fe-415', 'Fe-500', 'Fe-550'] },
      { name: 'Steel Rods', types: [] },
      { name: 'Binding Wire', types: [] },
      { name: 'MS Angles', types: [] },
      { name: 'Steel Plates', types: [] },
    ],
    brands: ['SAIL', 'TATA Steel', 'JSW', 'Vizag Steel', 'Jindal', 'Essar'],
    units: ['ton', 'kg', 'piece'],
    priceTypes: ['per_ton', 'per_kg'],
  },
  {
    name: 'Bricks & Blocks',
    img: '/categories/Bricks.png',
    subcategories: [
      { name: 'Red Bricks', types: ['Wire Cut', 'Table Mould', 'Extruded'] },
      { name: 'Fly Ash Bricks', types: [] },
      { name: 'Concrete Blocks', types: ['Solid', 'Hollow'] },
      { name: 'AAC Blocks', types: [] },
      { name: 'Paver Blocks', types: [] },
    ],
    brands: ['Local', 'National'],
    units: ['piece', 'load', 'ton'],
    priceTypes: ['per_piece', 'per_load', 'per_ton'],
  },
  {
    name: 'Sand & Aggregates',
    img: '/categories/Sand.png',
    subcategories: [
      { name: 'River Sand', types: [] },
      { name: 'M Sand', types: ['Plastering M Sand', 'Concrete M Sand'] },
      { name: 'Crushed Stone', types: ['6mm', '12mm', '20mm', '40mm'] },
      { name: 'Quarry Dust', types: [] },
      { name: 'Pit Sand', types: [] },
    ],
    brands: ['Local', 'National'],
    units: ['ton', 'load', 'kg'],
    priceTypes: ['per_ton', 'per_load'],
  },
  {
    name: 'Tiles & Flooring',
    img: '/categories/Tiles.png',
    subcategories: [
      { name: 'Ceramic Tiles', types: ['Floor', 'Wall', 'Bathroom'] },
      { name: 'Vitrified Tiles', types: ['Polished', 'Unpolished', 'Double Charge'] },
      { name: 'Mosaic Tiles', types: [] },
      { name: 'Granite', types: ['Polished', 'Rough'] },
      { name: 'Marble', types: [] },
      { name: 'Wooden Flooring', types: ['Laminate', 'Engineered'] },
    ],
    brands: ['Asian Granito', 'Kajaria', 'Somany', 'RAK', 'Nitco', 'Johnson'],
    units: ['sqft', 'piece', 'box'],
    priceTypes: ['per_sqft', 'per_piece'],
  },
  {
    name: 'Electrical',
    img: '/categories/Electricians.png',
    subcategories: [
      { name: 'Wires & Cables', types: [] },
      { name: 'Switches & Sockets', types: [] },
      { name: 'MCBs & Panels', types: [] },
      { name: 'LED Lights', types: [] },
      { name: 'Conduits & Pipes', types: [] },
    ],
    brands: ['Havells', 'Polycab', 'Finolex', 'Legrand', 'Anchor', 'Schneider'],
    units: ['piece', 'meter', 'kg'],
    priceTypes: ['per_piece', 'per_meter'],
  },
  {
    name: 'Plumbing',
    img: '/categories/Pumblers.png',
    subcategories: [
      { name: 'PVC Pipes', types: ['Plumbing', 'SWR', 'CPVC'] },
      { name: 'CPVC Pipes', types: [] },
      { name: 'PPR Pipes', types: [] },
      { name: 'Pipe Fittings', types: [] },
      { name: 'Water Tanks', types: ['Sintex', 'ZZ'] },
      { name: 'Sanitary Ware', types: [] },
    ],
    brands: ['Supreme', 'Finolex', 'Astral', 'Prince', 'Sintex'],
    units: ['piece', 'meter', 'kg'],
    priceTypes: ['per_piece', 'per_meter'],
  },
  {
    name: 'Paint & Chemicals',
    img: '/categories/Paint.png',
    subcategories: [
      { name: 'Interior Paint', types: ['Emulsion', 'Distemper', 'Primer'] },
      { name: 'Exterior Paint', types: ['Weather Coat', 'Texture', 'Masonry'] },
      { name: 'Waterproofing', types: ['Elastomeric', 'Cementitious'] },
      { name: 'Wood Polish', types: ['PU Coat', 'Melamine', 'NC'] },
      { name: 'Adhesives', types: [] },
    ],
    brands: ['Asian Paints', 'Berger', 'Nerolac', 'Dulux', 'Indigo', 'Dr. Fixit'],
    units: ['litre', 'kg', 'piece'],
    priceTypes: ['per_litre', 'per_kg'],
  },
  {
    name: 'Wood & Plywood',
    img: '/categories/Wood.png',
    emoji: '🪵',
    subcategories: [
      { name: 'Plywood', types: ['Commercial', 'BWR', 'Marine'] },
      { name: 'MDF Board', types: ['Plain', 'Pre-laminated'] },
      { name: 'Blockboard', types: [] },
      { name: 'Timber', types: ['Teak', 'Neem', 'Pine', 'Eucalyptus'] },
      { name: 'Flush Doors', types: [] },
    ],
    brands: ['Century', 'Green Ply', 'Kitply', 'National Plywood', 'Merino'],
    units: ['piece', 'sqft', 'kg'],
    priceTypes: ['per_piece', 'per_sqft'],
  },
  {
    name: 'Tools & Equipment',
    img: '/categories/Tools & Equipments.png',
    emoji: '🔧',
    subcategories: [
      { name: 'Power Tools', types: ['Drill Machine', 'Grinder', 'Circular Saw'] },
      { name: 'Hand Tools', types: ['Hammer', 'Chisel', 'Trowel', 'Plumb Bob'] },
      { name: 'Heavy Machinery', types: ['Mixer', 'Vibrator', 'Compactor'] },
      { name: 'Safety Equipment', types: ['Helmet', 'Gloves', 'Harness'] },
    ],
    brands: ['Bosch', 'Makita', 'Stanley', 'Dewalt', 'Hitachi'],
    units: ['piece', 'set'],
    priceTypes: ['per_piece', 'fixed'],
  },
  {
    name: 'Doors & Windows',
    img: '/categories/Doors & Windows.png',
    emoji: '🚪',
    subcategories: [
      { name: 'Wooden Doors', types: ['Solid Wood', 'Flush', 'Panel'] },
      { name: 'UPVC Doors', types: [] },
      { name: 'Steel Doors', types: [] },
      { name: 'UPVC Windows', types: ['Casement', 'Sliding', 'Fixed'] },
      { name: 'Aluminium Windows', types: [] },
      { name: 'Grills & Railings', types: [] },
    ],
    brands: ['Fenesta', 'Kommerling', 'LG HausYs', 'Premier Energies'],
    units: ['piece', 'set', 'sqft'],
    priceTypes: ['per_piece', 'per_sqft', 'fixed'],
  },
  {
    name: 'Crushed Stones',
    img: '/categories/Crushed Stones.png',
    emoji: '🪨',
    subcategories: [
      { name: '6mm Chips', types: [] },
      { name: '12mm Chips', types: [] },
      { name: '20mm Aggregate', types: [] },
      { name: '40mm Aggregate', types: [] },
    ],
    brands: ['Local', 'National'],
    units: ['ton', 'load'],
    priceTypes: ['per_ton', 'per_load'],
  },
];

// ─────────────────────────────────────────────
//  SERVICE CATEGORIES
// ─────────────────────────────────────────────
export const SERVICE_CATEGORIES = [
  {
    name: 'Mason (Mestri)',
    icon: '🧱',
    subcategories: [
      { name: 'Brick Work', types: ['Load Bearing', 'Partition', 'Boundary Wall'] },
      { name: 'Plastering', types: ['Internal', 'External', 'Textured'] },
      { name: 'Concrete Work', types: ['Roof Slab', 'Columns', 'Footings'] },
      { name: 'Waterproofing', types: [] },
      { name: 'Flooring', types: ['IPS', 'Mosaic', 'Tile Fixing'] },
    ],
    pricingTypes: ['per_day', 'per_sqft', 'per_project'],
  },
  {
    name: 'Contractor',
    icon: '🏗️',
    subcategories: [
      { name: 'Full House Construction', types: [] },
      { name: 'Renovation', types: ['Kitchen', 'Bathroom', 'Full House'] },
      { name: 'Commercial Projects', types: [] },
      { name: 'Road & Civil Works', types: [] },
    ],
    pricingTypes: ['per_sqft', 'per_project', 'fixed'],
  },
  {
    name: 'Carpenter',
    icon: '🪵',
    subcategories: [
      { name: 'Furniture Making', types: ['Bedroom', 'Kitchen', 'Office'] },
      { name: 'Door & Window Frames', types: [] },
      { name: 'Shuttering Work', types: [] },
      { name: 'Wardrobes & Modular', types: [] },
    ],
    pricingTypes: ['per_day', 'per_sqft', 'per_project'],
  },
  {
    name: 'Electrician',
    icon: '⚡',
    subcategories: [
      { name: 'New Wiring', types: ['Concealed', 'Open'] },
      { name: 'Repair & Maintenance', types: [] },
      { name: 'Panel & MCB Work', types: [] },
      { name: 'Light & Fan Installation', types: [] },
      { name: 'Solar Installation', types: [] },
    ],
    pricingTypes: ['per_day', 'per_hour', 'per_project'],
  },
  {
    name: 'Plumber',
    icon: '🔧',
    subcategories: [
      { name: 'New Plumbing', types: [] },
      { name: 'Leakage Repair', types: [] },
      { name: 'Bathroom Fitting', types: [] },
      { name: 'Water Tank Cleaning', types: [] },
    ],
    pricingTypes: ['per_day', 'per_hour', 'per_project'],
  },
  {
    name: 'Painter',
    icon: '🎨',
    subcategories: [
      { name: 'Interior Painting', types: [] },
      { name: 'Exterior Painting', types: [] },
      { name: 'Texture & Design', types: [] },
      { name: 'Waterproofing', types: [] },
    ],
    pricingTypes: ['per_day', 'per_sqft', 'per_project'],
  },
  {
    name: 'Tile Worker',
    icon: '🏠',
    subcategories: [
      { name: 'Floor Tile Fixing', types: [] },
      { name: 'Wall Tile Fixing', types: [] },
      { name: 'Bathroom Tiles', types: [] },
      { name: 'Outdoor & Terrace', types: [] },
    ],
    pricingTypes: ['per_day', 'per_sqft'],
  },
  {
    name: 'Welder',
    icon: '🔩',
    subcategories: [
      { name: 'Gate & Grill', types: [] },
      { name: 'Steel Fabrication', types: [] },
      { name: 'Staircase Railing', types: [] },
      { name: 'Roof Structure', types: [] },
    ],
    pricingTypes: ['per_day', 'per_project', 'per_sqft'],
  },
  {
    name: 'Labor / Helpers',
    icon: '👷',
    subcategories: [
      { name: 'General Labor', types: [] },
      { name: 'Material Loading', types: [] },
      { name: 'Site Cleaning', types: [] },
    ],
    pricingTypes: ['per_day'],
  },
  {
    name: 'Interior Designer',
    icon: '🛋️',
    subcategories: [
      { name: 'Residential Design', types: [] },
      { name: 'Commercial Design', types: [] },
      { name: 'Modular Kitchen', types: [] },
      { name: '3D Rendering', types: [] },
    ],
    pricingTypes: ['per_sqft', 'per_project', 'fixed'],
  },
  {
    name: 'Architect',
    icon: '📐',
    subcategories: [
      { name: 'House Plan', types: [] },
      { name: 'Structural Design', types: [] },
      { name: 'Building Approval', types: [] },
    ],
    pricingTypes: ['per_sqft', 'per_project', 'fixed'],
  },
  {
    name: 'Fabricator',
    icon: '⚙️',
    subcategories: [
      { name: 'Steel Structure', types: [] },
      { name: 'Shed & Roofing', types: [] },
      { name: 'MS Furniture', types: [] },
    ],
    pricingTypes: ['per_kg', 'per_project', 'per_sqft'],
  },
  {
    name: 'Machines & Equipment',
    icon: '🚜',
    subcategories: [
      { name: 'Earthmoving', types: ['JCB', 'Excavator', 'Backhoe', 'Bulldozer', 'Bobcat'] },
      { name: 'Concrete & Masonry', types: ['Concrete Mixer', 'Vibrator', 'Block Cutter', 'Compactor'] },
      { name: 'Material Handling', types: ['Crane', 'Hoist', 'Tractor', 'Dumper', 'Trolley'] },
      { name: 'Power Tools', types: ['Breaker', 'Drill Machine', 'Generator', 'Welding Machine'] },
    ],
    pricingTypes: ['per_day', 'per_hour', 'per_project'],
  },
];

export const UNIT_LABELS = {
  bag: 'Bag', ton: 'Ton', kg: 'Kg', piece: 'Piece',
  load: 'Load', sqft: 'Sq.ft', meter: 'Meter', litre: 'Litre',
};

export const PRICE_TYPE_LABELS = {
  per_bag: '/Bag', per_ton: '/Ton', per_kg: '/Kg', per_piece: '/Piece',
  per_sqft: '/Sq.ft', per_load: '/Load', per_litre: '/Litre',
  per_day: '/Day', per_hour: '/Hour', per_project: '/Project', fixed: 'Fixed',
};
