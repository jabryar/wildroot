(() => {
  "use strict";

  const WORLD_SIZE = 100;
  const BASE_TILE_SIZE = 28;
  const MIN_ZOOM = 0.42;
  const MAX_ZOOM = 2.5;
  const WORLD_CENTER = WORLD_SIZE / 2;
  const DAY_LENGTH_MS = 180000;
  const LOW_ZOOM_THRESHOLD = 0.65;
  const LOW_ZOOM_SIMULATION_INTERVAL_MS = 50;
  const LOW_ZOOM_RENDER_INTERVAL_MS = 1000 / 30;
  const PAUSED_MAP_RENDER_INTERVAL_MS = 1000 / 10;
  const PAUSED_LOW_ZOOM_RENDER_INTERVAL_MS = 1000 / 2;
  const TERRAIN_CACHE_ZOOM_THRESHOLD = 1.15;
  const NON_ESSENTIAL_UI_REFRESH_INTERVAL_MS = 900;
  const MAP_INTERACTION_SETTLE_MS = 180;
  const SAVE_KEY = "wildroot-village-save-v1";
  const SAVE_SLOT_PREFIX = "wildroot-village-save-v1-slot-";
  const MAX_SAVE_SLOTS = 3;
  const ACHIEVEMENT_KEY = "wildroot-village-achievements-v1";
  const SAVE_VERSION = 2;
  const SEASON_LENGTH = 12;
  const WEATHER_FADE_DAYS = 0.12;
  const EVERGREEN_TREE_SHARE = 0.1;
  const SEASONAL_LEAF_FADE_DAYS = 3;
  const STAFFED_SHIFT_START_HOUR = 7;
  const STAFFED_SHIFT_STANDARD_END_HOUR = 18.5;
  const FOOD_EATING_START_HOUR = 4;
  const FOOD_EATING_END_HOUR = 20;
  const FOOD_NEED_RANGES = {
    child: [0.4, 0.6],
    adult: [0.8, 1.3],
    elder: [0.5, 0.7]
  };
  const RESIDENT_LIFESPAN_MIN_DAYS = 40;
  const RESIDENT_LIFESPAN_MAX_DAYS = 60;
  const TRAVELLER_LIFESPAN_MIN_DAYS = 20;
  const TRAVELLER_LIFESPAN_MAX_DAYS = 40;
  const EVENT_MIN_GAP_DAYS = 1 / 3;
  const EVENT_MAX_GAP_DAYS = 7;
  const CITY_TRADE_DURATION_DAYS = 3;
  const CITY_TRADE_AMOUNT = 25;
  const ECOSYSTEM_COLLAPSE_THRESHOLD = 5;
  const PERFECT_ECOSYSTEM_DISPLAY_THRESHOLD = 99.5;

  const DIFFICULTIES = {
    gentle: {
      name: "Gentle",
      resourceMultiplier: 1.25,
      consumption: 0.84,
      resilience: 1.35,
      eventGap: 1.25,
      eventSeverity: 0.76,
      growth: 1.12,
      startingEco: 3
    },
    balanced: {
      name: "Balanced",
      resourceMultiplier: 1,
      consumption: 1,
      resilience: 1,
      eventGap: 1,
      eventSeverity: 1,
      growth: 1,
      startingEco: 0
    },
    harsh: {
      name: "Harsh",
      resourceMultiplier: 0.76,
      consumption: 1.2,
      resilience: 0.7,
      eventGap: 0.76,
      eventSeverity: 1.38,
      growth: 0.9,
      startingEco: -6
    }
  };

  const SEASONS = [
    { id: "spring", name: "Spring", icon: "🌱", farm: 1.15, waterUse: 0.94, color: "#8bc47c" },
    { id: "summer", name: "Summer", icon: "☀", farm: 1.28, waterUse: 1.2, color: "#dfbd67" },
    { id: "autumn", name: "Autumn", icon: "🍂", farm: 1, waterUse: 1, color: "#d28a55" },
    { id: "winter", name: "Winter", icon: "❄", farm: 0.38, waterUse: 0.88, color: "#9cc4c8" }
  ];

  const CITY_MARKET_PRICES = {
    food: { spring: 1, summer: 0.7, autumn: 1.2, winter: 1.8 },
    water: { spring: 0.75, summer: 1.35, autumn: 0.9, winter: 0.8 },
    wood: { spring: 0.9, summer: 0.85, autumn: 1.05, winter: 1.4 },
    stone: { spring: 0.95, summer: 1, autumn: 1.05, winter: 1.1 }
  };
  const CITY_RESOURCE_LABELS = { food: "Food", water: "Water", wood: "Timber", stone: "Stone" };
  const CITY_MARKET_EVENTS = [
    { id: "harvest_glut", title: "Lowland harvest glut", description: "City granaries are overflowing after a bumper harvest.", icon: "♧", duration: [1.5, 3], modifiers: { food: 0.62 } },
    { id: "grain_shortage", title: "Regional grain shortage", description: "Poor harvests have left city grain merchants competing for supplies.", icon: "!", duration: [1.5, 3], modifiers: { food: 1.65 } },
    { id: "dry_season", title: "Dry-season water demand", description: "Nearby settlements are buying water reserves ahead of a dry spell.", icon: "≈", duration: [1, 2.5], modifiers: { water: 1.7 } },
    { id: "building_boom", title: "City building boom", description: "A construction surge has increased demand for timber and stone.", icon: "⌂", duration: [2, 4], modifiers: { wood: 1.45, stone: 1.35 } },
    { id: "quarry_overstock", title: "Quarry overstock sale", description: "Regional quarries have more stone than their yards can hold.", icon: "◆", duration: [1.5, 3], modifiers: { stone: 0.65 } },
    { id: "timber_contract", title: "Timber contract", description: "A shipyard has placed a temporary premium order for seasoned timber.", icon: "▰", duration: [1, 2.5], modifiers: { wood: 1.7 } }
  ];
  const CITY_MARKET_EVENT_MIN_GAP_DAYS = 2;
  const CITY_MARKET_EVENT_MAX_GAP_DAYS = 5;

  const WEATHERS = {
    mild: { id: "mild", name: "Mild skies", icon: "○", food: 1, waterOutput: 1, wood: 1, eco: {}, duration: { minDays: 1, maxDays: 2.5, typicalDays: 1.75 } },
    cloudy: { id: "cloudy", name: "Cloudy", icon: "☁", food: 0.94, waterOutput: 1.02, wood: 0.96, eco: { water: 0.03 }, duration: { minDays: 3, maxDays: 5, typicalDays: 4 } },
    sun: { id: "sun", name: "Clear sunshine", icon: "☀", food: 1.08, waterOutput: 0.94, wood: 1.06, eco: { air: 0.05 }, duration: { minDays: 1, maxDays: 3, typicalDays: 2 } },
    drizzle: { id: "drizzle", name: "Soft rain", icon: "☂", food: 1.1, waterOutput: 1.18, wood: 0.92, eco: { water: 0.24, soil: 0.1, biodiversity: 0.04 }, duration: { minDays: 2 / 24, maxDays: 8 / 24, typicalDays: 5 / 24 } },
    rain: { id: "rain", name: "Steady rain", icon: "☂", food: 1.04, waterOutput: 1.3, wood: 0.78, eco: { water: 0.42, soil: 0.12 }, duration: { minDays: 6 / 24, maxDays: 18 / 24, typicalDays: 12 / 24 } },
    storm: { id: "storm", name: "Thunderstorms", icon: "ϟ", food: 0.74, waterOutput: 1.42, wood: 0.58, eco: { water: 0.32, soil: -0.12, forest: -0.08 }, severe: true, duration: { minDays: 1.5 / 24, maxDays: 2.5 / 24, typicalDays: 2 / 24 } },
    heatwave: { id: "heatwave", name: "Heatwave", icon: "☀", food: 0.66, waterOutput: 0.68, wood: 0.9, waterUse: 1.35, eco: { water: -0.5, wildlife: -0.14, soil: -0.2 }, severe: true, duration: { minDays: 2.5, maxDays: 3.5, typicalDays: 3 } },
    drought: { id: "drought", name: "Dry spell", icon: "☀", food: 0.56, waterOutput: 0.52, wood: 1.08, waterUse: 1.24, eco: { water: -0.72, wildlife: -0.18, soil: -0.3, biodiversity: -0.12 }, severe: true, duration: { minDays: 5, maxDays: 9, typicalDays: 7 } },
    wind: { id: "wind", name: "Strong winds", icon: "≈", food: 0.94, waterOutput: 0.96, wood: 0.82, eco: { air: 0.1 }, duration: { minDays: 3 / 24, maxDays: 10 / 24, typicalDays: 6.5 / 24 } },
    mist: { id: "mist", name: "Forest mist", icon: "≋", food: 0.98, waterOutput: 1.08, wood: 0.9, eco: { water: 0.08 }, duration: { minDays: 2 / 24, maxDays: 6 / 24, typicalDays: 4 / 24 } },
    frost: { id: "frost", name: "Hard frost", icon: "✧", food: 0.56, waterOutput: 0.8, wood: 0.92, eco: { soil: -0.08, wildlife: -0.08 }, duration: { minDays: 6 / 24, maxDays: 14 / 24, typicalDays: 10 / 24 } },
    snow: { id: "snow", name: "Gentle snow", icon: "❄", food: 0.42, waterOutput: 0.88, wood: 0.66, eco: { water: 0.1 }, duration: { minDays: 8 / 24, maxDays: 1, typicalDays: 16 / 24 } },
    blizzard: { id: "blizzard", name: "Blizzard", icon: "❄", food: 0.25, waterOutput: 0.62, wood: 0.36, waterUse: 1.05, eco: { wildlife: -0.24, forest: -0.12 }, severe: true, duration: { minDays: 3 / 24, maxDays: 7 / 24, typicalDays: 5 / 24 } }
  };

  const WEATHER_TABLES = {
    spring: ["mild", "cloudy", "cloudy", "sun", "drizzle", "drizzle", "rain", "rain", "storm", "mist"],
    summer: ["sun", "sun", "sun", "mild", "cloudy", "heatwave", "heatwave", "drought", "storm"],
    autumn: ["mild", "cloudy", "cloudy", "wind", "wind", "rain", "drizzle", "mist", "storm", "sun"],
    winter: ["cloudy", "cloudy", "frost", "frost", "snow", "snow", "mild", "wind", "sun", "blizzard", "mist"]
  };

  const LOGGER_RANGE = 7.5;
  const IN_RANGE_LOGGING_MULTIPLIER = 10;
  const OUTSIDE_TREE_FELLING_HOURS = 5;
  const STANDARD_LOGGING_CREW = 2;
  const BASE_TREE_FELLING_RATE = 24 / OUTSIDE_TREE_FELLING_HOURS / STANDARD_LOGGING_CREW;
  const TREE_TIMBER_MIN = 5;
  const TREE_TIMBER_MAX = 10;
  const BURNED_TREE_TIMBER_MULTIPLIER = 0.7;
  const DRY_RIVER_GUSH_DELAY_DAYS = 1 / 24;
  const DRY_RIVER_FLOW_DURATION_DAYS = 3 / 24;
  const AFTER_FIRE_BURNED_TREE_SHARE = 0.7;
  const TREE_PRIORITY_HOLD_MS = 650;
  const WOOD_FARM_PLOTS = 16;
  const WOOD_FARM_GROWTH_DAYS = 5;
  const CROP_POLLUTION_RANGE = 3;
  const NOISE_POLLUTION_RANGE = 5;
  const NOISE_MORALE_LOSS_PER_EXPOSURE = 0.9;
  const NOISE_HEALTH_LOSS_PER_EXPOSURE = 0.45;
  const VILLAGER_SPEED_MULTIPLIER = 1.65;
  const VILLAGER_PATH_DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const FIRST_NAMES = [
    "Alder", "Anwen", "Bram", "Bria", "Cedar", "Cora", "Dara", "Elian", "Elowen", "Fern", "Finn", "Greta",
    "Hazel", "Ivo", "Juniper", "Kai", "Lark", "Lina", "Mara", "Milo", "Nell", "Oren", "Perrin", "Rhea",
    "Rowan", "Sage", "Talia", "Tobin", "Una", "Vale", "Wren", "Yara"
  ];
  const SURNAMES = [
    "Ashdown", "Brook", "Clay", "Dewfield", "Ember", "Fairbough", "Green", "Hearth", "Ivy", "Junewood", "Kestrel", "Leaf",
    "Moss", "Northwind", "Oak", "Pine", "Quill", "Reed", "Stone", "Thorne", "Underhill", "Vale", "Willow", "Yarrow"
  ];
  const JOB_TITLES = {
    farm: "Farmer", well: "Water carrier", lumber: "Logger", hunter: "Hunter", quarry: "Stonecutter",
    storage: "Storekeeper", wood_farm: "Tree grower",
    forester: "Forester", sanctuary: "Wildlife warden", orchard: "Orchard keeper", apiary: "Beekeeper",
    rain_garden: "Water gardener", compost: "Composter", granary: "Storekeeper", reservoir: "Reservoir keeper",
    market: "Trader", windmill: "Miller", school: "Teacher", playground: "Groundskeeper", park: "Park keeper",
    clinic: "Healer", workshop: "Craftworker", townhall: "Clerk"
  };
  const CARRY_ITEMS = {
    farm: "food", orchard: "fruit", apiary: "honey", hunter: "food", well: "water", rain_garden: "water",
    reservoir: "water", lumber: "timber", forester: "saplings", quarry: "stone", workshop: "crafted goods",
    compost: "compost", granary: "grain", market: "supplies", windmill: "flour", school: "books",
    playground: "tools", park: "seedlings", clinic: "medicine", sanctuary: "field supplies", townhall: "records",
    storage: "stored goods", wood_farm: "saplings"
  };
  const WORK_PRIORITY_LEVELS = [
    { id: "low", label: "Low", icon: "↓", rank: 0 },
    { id: "normal", label: "Normal", icon: "–", rank: 1 },
    { id: "high", label: "High", icon: "↑", rank: 2 }
  ];

  const BUILDINGS = {
    hearth: {
      id: "hearth",
      name: "Founders’ Hearth",
      short: "H",
      category: "village",
      description: "The heart of the settlement. Houses twelve, organises village work and stores 400 of every resource.",
      cost: {},
      size: { w: 3, h: 3 },
      jobs: 0,
      housing: 12,
      storage: 400,
      removable: false,
      impact: "low",
      impactLabel: "Village heart",
      dailyEco: { air: -0.02, water: -0.01 }
    },
    cottage: {
      id: "cottage",
      name: "Cottage",
      short: "⌂",
      category: "village",
      description: "Warm housing for six people, with a modest fuel and waste footprint.",
      cost: { wood: 18, stone: 5 },
      size: { w: 2, h: 2 },
      jobs: 0,
      housing: 6,
      impact: "low",
      impactLabel: "Light impact",
      buildEco: { soil: -0.35, biodiversity: -0.12 },
      dailyEco: { air: -0.025, water: -0.018, biodiversity: -0.008 }
    },
    storage: {
      id: "storage",
      name: "Storehouse",
      short: "▣",
      category: "village",
      description: "A 2 × 2 storehouse adding room for 200 food, water, timber and stone items each.",
      cost: { wood: 28, stone: 12 },
      size: { w: 2, h: 2 },
      jobs: 0,
      storage: 200,
      impact: "low",
      impactLabel: "+200 each",
      buildEco: { soil: -0.32, biodiversity: -0.08 },
      dailyEco: { air: -0.015 }
    },
    barn: {
      id: "barn",
      name: "Farm Barn",
      short: "▤",
      category: "industry",
      description: "A 2 × 2 food-only store beside a Field Farm. Holds 500 food and puts steady pressure on the soil.",
      cost: { wood: 20, stone: 6 },
      size: { w: 2, h: 2 },
      jobs: 0,
      storageByResource: { food: 500 },
      requiresAdjacentType: "farm",
      impact: "medium",
      impactLabel: "Soil pressure",
      buildEco: { soil: -0.25 },
      dailyEco: { soil: -0.05 }
    },
    water_tank: {
      id: "water_tank",
      name: "Water Tank",
      short: "◯",
      category: "village",
      description: "A 2 × 2 covered tank that adds room for 500 water only.",
      cost: { wood: 22, stone: 12 },
      size: { w: 2, h: 2 },
      jobs: 0,
      storageByResource: { water: 500 },
      impact: "low",
      impactLabel: "Water-only storage",
      buildEco: { soil: -0.18 },
      dailyEco: { soil: -0.02 }
    },
    timber_yard: {
      id: "timber_yard",
      name: "Timber Yard",
      short: "▰",
      category: "industry",
      description: "A 2 × 2 covered timber stack that adds room for 500 timber only.",
      cost: { wood: 14, stone: 8 },
      size: { w: 2, h: 2 },
      jobs: 0,
      storageByResource: { wood: 500 },
      impact: "low",
      impactLabel: "Timber-only storage",
      buildEco: { soil: -0.18 },
      dailyEco: { soil: -0.02 }
    },
    stone_depot: {
      id: "stone_depot",
      name: "Stone Depot",
      short: "⬟",
      category: "industry",
      description: "A 2 × 2 stone store that adds room for 500 stone only.",
      cost: { wood: 16, stone: 10 },
      size: { w: 2, h: 2 },
      jobs: 0,
      storageByResource: { stone: 500 },
      impact: "low",
      impactLabel: "Stone-only storage",
      buildEco: { soil: -0.2 },
      dailyEco: { soil: -0.025 }
    },
    large_storage: {
      id: "large_storage",
      name: "Large Storehouse",
      short: "▦",
      category: "village",
      description: "A 3 × 3 central storehouse adding room for 500 food, water, timber and stone each.",
      cost: { wood: 55, stone: 40 },
      size: { w: 3, h: 3 },
      jobs: 0,
      storage: 500,
      unlockPopulation: 50,
      impact: "medium",
      impactLabel: "+500 each",
      buildEco: { soil: -0.65, biodiversity: -0.16 },
      dailyEco: { air: -0.025 }
    },
    creek_bridge: {
      id: "creek_bridge",
      name: "Creek Footbridge",
      short: "═",
      category: "village",
      description: "A narrow 1 × 3 crossing for a one-tile creek. Both ends must meet cleared land; every deck tile remains walkable.",
      cost: { wood: 10, stone: 2 },
      size: { w: 1, h: 3 },
      jobs: 0,
      bridge: "creek",
      impact: "low",
      impactLabel: "Keeps creek open",
      buildEco: { water: -0.04, soil: -0.04, biodiversity: -0.025 }
    },
    river_bridge: {
      id: "river_bridge",
      name: "River Bridge",
      short: "═",
      category: "village",
      description: "A durable 1 × 5 crossing for the three-tile river. Both ends must meet cleared land; every deck tile remains walkable.",
      cost: { wood: 22, stone: 28 },
      size: { w: 1, h: 5 },
      jobs: 0,
      bridge: "river",
      impact: "low",
      impactLabel: "Keeps river connected",
      unlockPopulation: 12,
      buildEco: { water: -0.08, soil: -0.08, biodiversity: -0.045 }
    },
    farm: {
      id: "farm",
      name: "Field Farm",
      short: "≋",
      category: "industry",
      description: "Reliable seasonal food. Two farmers provide normal output; a third raises the total to 2×. Uses water and slowly exhausts unprotected soil.",
      cost: { wood: 16, stone: 2 },
      size: { w: 4, h: 3 },
      jobs: 3,
      standardStaff: 2,
      fullStaffProduction: 2,
      impact: "medium",
      impactLabel: "Soil pressure",
      buildEco: { soil: -0.65, biodiversity: -0.35 },
      dailyEco: { soil: -0.2, water: -0.1, biodiversity: -0.075 }
    },
    well: {
      id: "well",
      name: "Village Well",
      short: "◉",
      category: "village",
      description: "Draws clean groundwater. Too many wells will drain the water table.",
      cost: { wood: 12, stone: 12 },
      size: { w: 1, h: 1 },
      jobs: 0,
      impact: "medium",
      impactLabel: "Draws water",
      buildEco: { soil: -0.2, water: -0.2 },
      dailyEco: { water: -0.14 }
    },
    river_pump: {
      id: "river_pump",
      name: "River Pump",
      short: "↟",
      category: "village",
      description: "Draws water from a neighbouring creek or river without building in the channel. Its screened intake causes a small wildlife disturbance and a quiet one-tile pump hum.",
      cost: { wood: 16, stone: 10 },
      size: { w: 1, h: 1 },
      jobs: 0,
      waterIntake: true,
      noise: 0.55,
      noiseRange: 1,
      impact: "low",
      impactLabel: "−0.05 wildlife/day",
      dailyEco: { wildlife: -0.05 }
    },
    lumber: {
      id: "lumber",
      name: "Logging Camp",
      short: "▥",
      category: "industry",
      description: "A full two-person crew fells an outside-zone tree in five base hours and works 10× faster inside the 15 × 15 zone. Stumps use the same speed. Healthy trees supply 5–10 timber; fire-damaged trees supply 30% less. Weather, education and illness can alter the exact time.",
      cost: { wood: 12, stone: 6 },
      size: { w: 3, h: 2 },
      jobs: 2,
      impact: "heavy",
      impactLabel: "Heavy impact",
      pollution: 0.8,
      noise: 2.2,
      buildEco: { forest: -1.1, wildlife: -0.3, biodiversity: -0.45 },
      dailyEco: { forest: -0.55, wildlife: -0.13, biodiversity: -0.14 }
    },
    wood_farm: {
      id: "wood_farm",
      name: "Wood Farm",
      short: "♠",
      category: "industry",
      description: "A managed 4 × 4 grove with sixteen trees. Nearby Logging Camps harvest mature plots before unmarked wild trees, and every harvested plot takes five days to regrow.",
      cost: { wood: 30, stone: 8 },
      size: { w: 4, h: 4 },
      jobs: 1,
      impact: "medium",
      impactLabel: "Managed timber",
      unlockPopulation: 12,
      buildEco: { soil: -0.5, biodiversity: -0.18 },
      dailyEco: { forest: 0.1, wildlife: 0.025, water: -0.055, soil: -0.035, biodiversity: -0.025 }
    },
    hunter: {
      id: "hunter",
      name: "Hunter’s Lodge",
      short: "⌁",
      category: "industry",
      description: "Provides meat in every season, but can empty the forest of wildlife.",
      cost: { wood: 17, stone: 3 },
      size: { w: 2, h: 2 },
      jobs: 2,
      impact: "heavy",
      impactLabel: "Wildlife loss",
      buildEco: { wildlife: -0.8, biodiversity: -0.25 },
      dailyEco: { wildlife: -0.62, biodiversity: -0.15 }
    },
    quarry: {
      id: "quarry",
      name: "Stone Quarry",
      short: "⬟",
      category: "industry",
      description: "Cuts useful stone from the clearing, scarring soil and waterways while stone cutting creates strong noise near homes.",
      cost: { wood: 20 },
      size: { w: 4, h: 3 },
      jobs: 3,
      impact: "heavy",
      impactLabel: "Heavy impact",
      pollution: 2,
      noise: 2.8,
      buildEco: { soil: -1.15, water: -0.35, biodiversity: -0.45 },
      dailyEco: { soil: -0.38, water: -0.15, air: -0.22, biodiversity: -0.1 }
    },
    forester: {
      id: "forester",
      name: "Forester’s Hut",
      short: "♧",
      category: "nature",
      description: "Harvests modest timber while planting a mixed, healthy forest.",
      cost: { wood: 20, stone: 5 },
      size: { w: 2, h: 2 },
      jobs: 2,
      impact: "restores",
      impactLabel: "Restores forest",
      buildEco: { forest: 0.35, soil: -0.12 },
      dailyEco: { forest: 0.43, wildlife: 0.12, soil: 0.06, biodiversity: 0.21 }
    },
    sanctuary: {
      id: "sanctuary",
      name: "Wild Sanctuary",
      short: "✦",
      category: "nature",
      description: "Land returned to nature. Strongly restores wildlife and biodiversity.",
      cost: { wood: 22, stone: 4 },
      size: { w: 4, h: 4 },
      jobs: 0,
      impact: "restores",
      impactLabel: "Strong restoration",
      buildEco: { forest: 0.6, wildlife: 0.5, biodiversity: 0.65 },
      dailyEco: { forest: 0.21, wildlife: 0.36, water: 0.1, soil: 0.13, air: 0.08, biodiversity: 0.4 }
    },
    orchard: {
      id: "orchard",
      name: "Mixed Orchard",
      short: "♠",
      category: "nature",
      description: "A diverse food grove that feeds people while sheltering pollinators and birds.",
      cost: { wood: 24, stone: 4 },
      size: { w: 4, h: 4 },
      jobs: 3,
      impact: "restores",
      impactLabel: "Living harvest",
      unlockPopulation: 12,
      buildEco: { soil: -0.25, biodiversity: 0.35 },
      dailyEco: { wildlife: 0.06, soil: 0.04, water: -0.055, biodiversity: 0.14 }
    },
    apiary: {
      id: "apiary",
      name: "Wildflower Apiary",
      short: "✿",
      category: "nature",
      description: "Produces a little food and pollinates every farm and orchard in the clearing.",
      cost: { wood: 18, stone: 2 },
      size: { w: 2, h: 2 },
      jobs: 1,
      impact: "restores",
      impactLabel: "Pollinator haven",
      unlockPopulation: 15,
      buildEco: { biodiversity: 0.25 },
      dailyEco: { wildlife: 0.08, biodiversity: 0.2 }
    },
    rain_garden: {
      id: "rain_garden",
      name: "Rain Garden",
      short: "≈",
      category: "nature",
      description: "Automatically captures runoff day and night. Up to three optional water gardeners can raise daytime water output to 2×.",
      cost: { wood: 16, stone: 14 },
      size: { w: 3, h: 2 },
      jobs: 0,
      workerCapacity: 3,
      automaticProduction: 1,
      fullStaffProduction: 2,
      impact: "restores",
      impactLabel: "Cleans water",
      unlockPopulation: 16,
      buildEco: { soil: -0.2, water: 0.45, biodiversity: 0.25 },
      dailyEco: { water: 0.18, soil: 0.06, biodiversity: 0.09 }
    },
    compost: {
      id: "compost",
      name: "Compost Yard",
      short: "↻",
      category: "nature",
      description: "Turns village waste into fertile soil and reduces the settlement’s pollution.",
      cost: { wood: 20, stone: 8 },
      size: { w: 2, h: 2 },
      jobs: 0,
      impact: "restores",
      impactLabel: "Restores soil",
      unlockPopulation: 20,
      buildEco: { soil: -0.15 },
      dailyEco: { soil: 0.32, air: 0.05, water: 0.07, biodiversity: 0.06 }
    },
    granary: {
      id: "granary",
      name: "Community Granary",
      short: "▥",
      category: "village",
      description: "Careful storage reduces food waste and makes every ration stretch further.",
      cost: { wood: 28, stone: 16 },
      size: { w: 3, h: 2 },
      jobs: 1,
      impact: "low",
      impactLabel: "Less food waste",
      unlockPopulation: 18,
      buildEco: { soil: -0.35 },
      dailyEco: { air: -0.025 }
    },
    reservoir: {
      id: "reservoir",
      name: "Covered Reservoir",
      short: "◒",
      category: "village",
      description: "Stores rainfall and supplies steady water without repeatedly deepening wells.",
      cost: { wood: 34, stone: 30 },
      size: { w: 4, h: 3 },
      jobs: 2,
      impact: "medium",
      impactLabel: "Large footprint",
      unlockPopulation: 26,
      buildEco: { soil: -0.7, biodiversity: -0.2 },
      dailyEco: { water: -0.025 }
    },
    market: {
      id: "market",
      name: "Village Market",
      short: "◇",
      category: "village",
      description: "Improves distribution and happiness, makes producers more efficient, and unlocks three-day city caravans for seasonal trade.",
      cost: { wood: 28, stone: 18 },
      size: { w: 3, h: 3 },
      jobs: 2,
      impact: "low",
      impactLabel: "Small waste cost",
      unlockPopulation: 18,
      buildEco: { soil: -0.45 },
      dailyEco: { air: -0.05, water: -0.035 }
    },
    windmill: {
      id: "windmill",
      name: "Windmill",
      short: "✣",
      category: "industry",
      description: "Automatic clean power raises every farm’s output without burning timber or requiring workers. Its low mechanical hum can still disturb very close homes.",
      cost: { wood: 32, stone: 20 },
      size: { w: 2, h: 2 },
      jobs: 0,
      impact: "low",
      impactLabel: "Clean power",
      noise: 0.65,
      noiseRange: 3,
      unlockPopulation: 22,
      buildEco: { soil: -0.5, biodiversity: -0.2 },
      dailyEco: { air: 0.035 }
    },
    flower_patch: {
      id: "flower_patch",
      name: "Native Flower Patch",
      short: "✿",
      category: "decoration",
      description: "A small native flower patch that supports pollinators and adds colour to the village.",
      cost: { wood: 2 },
      size: { w: 1, h: 1 },
      jobs: 0,
      impact: "restores",
      impactLabel: "+0.01 biodiversity/day",
      dailyEco: { biodiversity: 0.01 }
    },
    native_shrub: {
      id: "native_shrub",
      name: "Native Shrub",
      short: "♣",
      category: "decoration",
      description: "A hardy local shrub that offers small pockets of shelter and habitat.",
      cost: { wood: 2 },
      size: { w: 1, h: 1 },
      jobs: 0,
      impact: "restores",
      impactLabel: "+0.01 biodiversity/day",
      dailyEco: { biodiversity: 0.01 }
    },
    bird_bath: {
      id: "bird_bath",
      name: "Bird Bath",
      short: "◌",
      category: "decoration",
      description: "A small water feature that gives birds a safe place to drink in the clearing.",
      cost: { stone: 2 },
      size: { w: 1, h: 1 },
      jobs: 0,
      impact: "restores",
      impactLabel: "+0.01 wildlife/day",
      dailyEco: { wildlife: 0.01 }
    },
    bench: {
      id: "bench",
      name: "Village Bench",
      short: "▰",
      category: "decoration",
      description: "A simple timber bench for villagers, with a very small built-land footprint.",
      cost: { wood: 3 },
      size: { w: 1, h: 1 },
      jobs: 0,
      impact: "low",
      impactLabel: "−0.01 soil/day",
      dailyEco: { soil: -0.01 }
    },
    lantern: {
      id: "lantern",
      name: "Path Lantern",
      short: "♦",
      category: "decoration",
      description: "A compact lantern that marks a path but adds a tiny amount of hard surface.",
      cost: { wood: 2, stone: 1 },
      size: { w: 1, h: 1 },
      jobs: 0,
      impact: "low",
      impactLabel: "−0.01 soil/day",
      dailyEco: { soil: -0.01 }
    },
    stone_statue: {
      id: "stone_statue",
      name: "Stone Statue",
      short: "♜",
      category: "decoration",
      description: "A 2 × 2 stone landmark. Its heavy foundation puts lasting pressure on the soil.",
      cost: { stone: 14 },
      size: { w: 2, h: 2 },
      jobs: 0,
      impact: "medium",
      impactLabel: "−0.10 soil/day",
      dailyEco: { soil: -0.1 }
    },
    school: {
      id: "school",
      name: "Village School",
      short: "▤",
      category: "village",
      description: "Up to sixteen school places educate offspring while at least one teacher is assigned.",
      cost: { wood: 30, stone: 18 },
      size: { w: 3, h: 2 },
      jobs: 2,
      schoolSeats: 16,
      impact: "restores",
      impactLabel: "Cleaner methods",
      unlockPopulation: 16,
      buildEco: { soil: -0.35 },
      dailyEco: { biodiversity: 0.04 }
    },
    playground: {
      id: "playground",
      name: "Children’s Green",
      short: "◌",
      category: "village",
      description: "A safe outdoor commons that improves offspring health and family happiness.",
      cost: { wood: 22, stone: 6 },
      size: { w: 3, h: 2 },
      jobs: 0,
      childSupport: 10,
      impact: "low",
      impactLabel: "Family wellbeing",
      unlockPopulation: 12,
      buildEco: { soil: -0.28, biodiversity: -0.08 },
      dailyEco: { air: 0.03, biodiversity: 0.025 }
    },
    park: {
      id: "park",
      name: "Town Park",
      short: "♣",
      category: "nature",
      description: "Native greenery brings nature into town and lifts village happiness.",
      cost: { wood: 22, stone: 18 },
      size: { w: 4, h: 3 },
      jobs: 0,
      impact: "restores",
      impactLabel: "Urban habitat",
      unlockPopulation: 30,
      buildEco: { forest: 0.2, soil: -0.15 },
      dailyEco: { forest: 0.09, wildlife: 0.08, soil: 0.08, air: 0.13, biodiversity: 0.14 }
    },
    townhouse: {
      id: "townhouse",
      name: "Townhouse",
      short: "▦",
      category: "village",
      description: "Dense homes for sixteen. Efficient land use, but more waste and water demand.",
      cost: { wood: 46, stone: 36 },
      size: { w: 2, h: 3 },
      jobs: 0,
      housing: 16,
      impact: "medium",
      impactLabel: "Dense housing",
      unlockPopulation: 35,
      buildEco: { soil: -0.7, biodiversity: -0.25 },
      dailyEco: { air: -0.07, water: -0.06, biodiversity: -0.02 }
    },
    clinic: {
      id: "clinic",
      name: "Village Clinic",
      short: "+",
      category: "village",
      description: "Protects health during shortages, harsh weather and disease events.",
      cost: { wood: 38, stone: 32 },
      size: { w: 3, h: 2 },
      jobs: 3,
      impact: "low",
      impactLabel: "Low impact",
      unlockPopulation: 40,
      buildEco: { soil: -0.45 },
      dailyEco: { water: -0.04 }
    },
    workshop: {
      id: "workshop",
      name: "Civic Workshop",
      short: "⚒",
      category: "industry",
      description: "Produces timber and stone goods, but nearby fumes reduce crop output, disturb forest wildlife and expose homes to tool noise.",
      cost: { wood: 48, stone: 38 },
      size: { w: 4, h: 3 },
      jobs: 4,
      impact: "heavy",
      impactLabel: "Polluting",
      pollution: 3,
      noise: 2.4,
      unlockPopulation: 45,
      buildEco: { soil: -0.8, air: -0.4 },
      dailyEco: { soil: -0.12, water: -0.16, air: -0.48, biodiversity: -0.09 }
    },
    townhall: {
      id: "townhall",
      name: "Town Hall",
      short: "⚑",
      category: "village",
      description: "Marks the settlement as a small city and encourages faster migration.",
      cost: { wood: 70, stone: 65 },
      size: { w: 4, h: 3 },
      jobs: 4,
      impact: "medium",
      impactLabel: "Civic footprint",
      unlockPopulation: 60,
      buildEco: { soil: -1, biodiversity: -0.35 },
      dailyEco: { air: -0.08, water: -0.04 }
    }
  };

  const BUILD_CATEGORY_ORDER = { village: 0, industry: 1, nature: 2, decoration: 3 };
  const BUILD_ORDER = Object.values(BUILDINGS)
    .filter(def => def.id !== "hearth")
    .sort((a, b) => (BUILD_CATEGORY_ORDER[a.category] ?? 99) - (BUILD_CATEGORY_ORDER[b.category] ?? 99) || a.name.localeCompare(b.name))
    .map(def => def.id);

  function getNoisePollutionRange(buildingOrType) {
    const type = typeof buildingOrType === "string" ? buildingOrType : buildingOrType?.type;
    return BUILDINGS[type]?.noiseRange || NOISE_POLLUTION_RANGE;
  }

  const ECO_LABELS = {
    forest: "Forest cover",
    wildlife: "Wildlife",
    water: "Water quality",
    soil: "Soil health",
    air: "Clean air",
    biodiversity: "Biodiversity"
  };

  const ECO_SYSTEM_CONTEXT = {
    forest: {
      definition: "A simplified indicator of wild forest cover, structure and capacity to recover.",
      connection: "Forest slows runoff, anchors soil, stores carbon and gives wildlife connected shelter. Severe forest loss therefore also weakens soil, wildlife and biodiversity."
    },
    wildlife: {
      definition: "A simplified indicator of the abundance and security of wild animal populations.",
      connection: "Wildlife disperses seeds, pollinates plants and moves energy through food webs. Habitat, clean water and low disturbance all influence whether animal populations can recover."
    },
    water: {
      definition: "A simplified indicator combining water cleanliness, availability and watershed health.",
      connection: "Water links weather, soil, plants, people and industry. When water quality becomes severely stressed, wildlife, soil life and biodiversity also lose resilience."
    },
    soil: {
      definition: "A simplified indicator of fertility, soil life, structure and ability to hold water.",
      connection: "Living soil cycles nutrients, stores rainfall and supports crops and forests. Bare ground, extraction and repeated harvest can damage it faster than natural formation repairs it."
    },
    air: {
      definition: "A simplified indicator of smoke, dust and the atmosphere’s ability to support health.",
      connection: "Air quality connects energy, industry, vegetation and public health. Cleaner technology reduces operating pollution, while forests and green space help filter air and store carbon."
    },
    biodiversity: {
      definition: "A simplified indicator of variety across species, habitats and ecological relationships.",
      connection: "Diversity gives ecosystems multiple ways to keep functioning after drought, disease or disturbance. A high tree count alone cannot replace varied, connected habitat."
    }
  };

  const ECO_COACH_GUIDE = {
    forest: {
      icon: "♣",
      principle: "Forests store carbon, protect soil and create connected habitat. A tree plantation supplies timber, but it does not replace a diverse wild forest.",
      action: "Pause new clearing, use Foresters for restoration, and place Wood Farms near Logging Camps so timber can regrow."
    },
    wildlife: {
      icon: "♧",
      principle: "Animals need food, shelter and safe routes between habitats. Losing forest or exposing forest edges to pollution reduces wildlife.",
      action: "Reduce hunting, move polluters away from forest edges, and create Sanctuaries, Orchards or Parks as habitat."
    },
    water: {
      icon: "≈",
      principle: "Clean water is renewed slowly. Wells, farms, people and industry can use or contaminate it faster than rain replaces it.",
      action: "Limit groundwater demand, capture rain with Rain Gardens, and keep Quarries and Workshops away from vulnerable land."
    },
    soil: {
      icon: "↻",
      principle: "Living soil stores water and nutrients. Repeated cropping, quarrying and construction remove fertility faster than it naturally returns.",
      action: "Use Compost Yards, Orchards and habitat restoration, and avoid expanding farms faster than soil can recover."
    },
    air: {
      icon: "◌",
      principle: "Clean air depends on limiting smoke and dust while keeping enough vegetation to filter pollution and store carbon.",
      action: "Limit Workshops and Quarries, favour clean infrastructure, and use Parks and healthy forest to improve air quality."
    },
    biodiversity: {
      icon: "✦",
      principle: "Biodiversity is the variety of species and habitats in a living system. Variety makes ecosystems more stable during drought, disease and change.",
      action: "Protect several habitat types with Sanctuaries, Orchards, Parks and clean water—not only rows of one managed tree."
    }
  };

  const ENVIRONMENT_LESSONS = [
    {
      id: "living_system",
      icon: "◎",
      title: "One connected system",
      principle: "Forest, wildlife, water, soil, air and biodiversity support one another. A high average cannot always rescue one collapsing part.",
      realWorld: "Environmental dashboards use several indicators because a single average can hide a polluted river, disappearing species or damaged soil.",
      mission: "Reach Day 3 while every ecosystem indicator remains at 70 or higher.",
      test: () => state.day >= 3 && Math.min(...Object.values(state.ecosystem)) >= 70
    },
    {
      id: "renewable_forestry",
      icon: "♠",
      title: "Harvest at regrowth speed",
      principle: "A renewable resource is sustainable only when it can regrow at least as quickly as it is harvested.",
      realWorld: "Foresters compare harvest with growth over many years and protect old, dead and habitat trees that timber totals do not describe.",
      mission: "Use a Forester, or connect a Logging Camp to a nearby Wood Farm.",
      test: () => countBuilding("forester") > 0 || state.buildings.some(camp => camp.type === "lumber" && getWoodFarmsInRange(camp).length > 0)
    },
    {
      id: "living_soil",
      icon: "↻",
      title: "Feed the soil",
      principle: "Healthy soil is alive. Returning organic material protects nutrients, water storage and future harvests.",
      realWorld: "Compost, crop rotation, ground cover and reduced erosion help farms retain carbon, nutrients, water and microscopic soil life.",
      mission: "Build a Compost Yard alongside at least one Farm or Orchard.",
      test: () => countBuilding("compost") > 0 && (countBuilding("farm") + countBuilding("orchard") > 0)
    },
    {
      id: "water_cycle",
      icon: "≈",
      title: "Work with the water cycle",
      principle: "Rainfall, soil and plants recharge water slowly. Extraction and pollution can outrun that natural cycle.",
      realWorld: "Rain gardens, wetlands and permeable ground slow stormwater so it can soak in and reduce flooding. Creeks and rivers also move water, sediment, nutrients and wildlife; a bridge keeps that channel more connected than filling it with earth.",
      mission: "Build a Rain Garden to capture and filter runoff.",
      test: () => countBuilding("rain_garden") > 0
    },
    {
      id: "habitat_variety",
      icon: "✦",
      title: "Protect habitat variety",
      principle: "Different species need different food and shelter. Connected, varied habitat is stronger than one uniform plantation.",
      realWorld: "Conservation plans protect nesting sites, feeding areas, waterways and movement corridors rather than counting only total green area.",
      mission: "Create a Wild Sanctuary, or combine an Orchard with a Town Park.",
      test: () => countBuilding("sanctuary") > 0 || (countBuilding("orchard") > 0 && countBuilding("park") > 0)
    },
    {
      id: "pollution_zoning",
      icon: "◇",
      title: "Separate harm from food and homes",
      principle: "Pollution is often local. Thoughtful zoning protects crops, waterways, forest edges and homes without stopping all production.",
      realWorld: "Noise is pollution when unwanted sound disrupts sleep, wellbeing or health. Land-use buffers and quieter technology reduce exposure, although preventing noise and emissions at their source remains stronger than moving them elsewhere.",
      mission: "Operate a polluting or noisy workplace without reducing crops or exposing residents at home.",
      test: () => {
        const polluters = state.buildings.filter(building => BUILDINGS[building.type]?.pollution || BUILDINGS[building.type]?.noise);
        const crops = state.buildings.filter(building => ["farm", "orchard"].includes(building.type));
        return polluters.length > 0
          && crops.every(crop => getCropPollutionInfo(crop).penalty < 0.005)
          && getVillageNoiseReport().exposedResidents === 0;
      }
    },
    {
      id: "resource_limits",
      icon: "▣",
      title: "Plan for limits",
      principle: "Storage prevents useful supplies from being wasted, but capacity does not create new resources or repair ecological damage.",
      realWorld: "Emergency reserves improve resilience to drought and disrupted harvests, but they must be replenished from a sustainable supply.",
      mission: "Build a Storehouse and raise every resource capacity to at least 600.",
      test: () => ["food", "water", "wood", "stone"].every(resource => getStorageCapacity(resource) >= 600)
    },
    {
      id: "resilient_community",
      icon: "▤",
      title: "Teach the next generation",
      principle: "Environmental protection lasts when knowledge, health and planning grow with the settlement—not after damage has already occurred.",
      realWorld: "Environmental education works best when scientific evidence is combined with local knowledge, observation and community participation.",
      mission: "Support 25 people, operate a School, and keep the ecosystem at 70 or higher.",
      test: () => state.population >= 25 && countBuilding("school") > 0 && ecosystemScore() >= 70
    },
    {
      id: "day_night_cycles",
      icon: "◐",
      title: "Observe the day–night system",
      principle: "A settlement has rhythms. Staffed work pauses while people sleep, and people eat between 04:00 and 20:00; water use, weather, natural processes and automatic infrastructure continue. Resource rates show the weighted average across the entire day.",
      realWorld: "Electricity, transport and water systems also have daily demand cycles, so planners compare peak loads with full-day totals.",
      mission: "Reach nighttime with at least one staffed workplace and one automatic building in the village.",
      test: () => isVillagerNight()
        && state.buildings.some(building => (BUILDINGS[building.type]?.jobs || 0) > 0)
        && state.buildings.some(building => !(BUILDINGS[building.type]?.jobs || 0))
    },
    {
      id: "food_webs",
      icon: "⌘",
      title: "Protect the food web",
      principle: "Plants, insects, herbivores and predators transfer energy through a food web. Habitat loss can affect species far beyond the first one displaced.",
      realWorld: "Ecologists trace direct and indirect relationships because losing a predator, pollinator or food plant can cause changes across many species.",
      mission: "Maintain a Wild Sanctuary while wildlife and biodiversity are both at least 75.",
      test: () => countBuilding("sanctuary") > 0 && state.ecosystem.wildlife >= 75 && state.ecosystem.biodiversity >= 75
    },
    {
      id: "clean_energy",
      icon: "✣",
      title: "Use cleaner energy",
      principle: "Cleaner technology can reduce fuel combustion, but it still needs materials and land. The best choice considers its whole life cycle.",
      realWorld: "Life-cycle assessment compares extraction, manufacture, operation and disposal instead of judging technology only while it is running.",
      mission: "Power at least one Farm with a Windmill while clean air remains at 75 or higher.",
      test: () => countBuilding("windmill") > 0 && countBuilding("farm") > 0 && state.ecosystem.air >= 75
    },
    {
      id: "seasonal_resilience",
      icon: "❄",
      title: "Prepare for seasonal change",
      principle: "Weather is short-term; seasons shift the long-term pattern. Resilient communities prepare surplus before demand rises or harvests fall.",
      realWorld: "Seasonal forecasts help communities plan planting, water reserves, fire preparation and emergency support. Winter ice can cover moving water while flow and aquatic life continue below, and its strength can vary dangerously.",
      mission: "Reach winter with at least five days of food and water stored for every resident.",
      test: () => state.day >= 37 && state.resources.food >= state.population * 5 && state.resources.water >= state.population * 5
    },
    {
      id: "carrying_capacity",
      icon: "∞",
      title: "Respect carrying capacity",
      principle: "Carrying capacity is the population an environment can support over time. Technology can change the limit, but not erase dependence on resources and waste sinks.",
      realWorld: "Carrying capacity changes with consumption, trade, technology, climate and ecosystem condition; it is a moving limit, not one universal number.",
      mission: "House at least 35 people while keeping the ecosystem at 70 or higher.",
      test: () => state.population >= 35 && getHousing() >= state.population && ecosystemScore() >= 70
    },
    {
      id: "restoration_portfolio",
      icon: "⊕",
      title: "Restore several processes",
      principle: "Restoration works best when it repairs several processes together: soil cycling, clean water, habitat and species relationships.",
      realWorld: "Successful restoration measures recovery over time and may combine revegetation, water repair, invasive-species control and habitat protection.",
      mission: "Operate a Compost Yard, Rain Garden and Wild Sanctuary in the same village.",
      test: () => countBuilding("compost") > 0 && countBuilding("rain_garden") > 0 && countBuilding("sanctuary") > 0
    },
    {
      id: "ecological_thresholds",
      icon: "△",
      title: "Watch thresholds, not just averages",
      principle: "Environmental change is not always smooth. Below a threshold, reinforcing feedbacks can make further decline faster and recovery harder.",
      realWorld: "Thresholds are uncertain, so precaution means acting before damage is obvious rather than treating an estimated boundary as a safe target.",
      mission: "Reach Day 15 while every ecosystem indicator is at least 60.",
      test: () => state.day >= 15 && Math.min(...Object.values(state.ecosystem)) >= 60
    },
    {
      id: "habitat_networks",
      icon: "⌘",
      title: "Build a habitat network",
      principle: "Small habitat patches protect more species when they provide varied needs and safe movement between larger natural areas.",
      realWorld: "Wildlife corridors can connect isolated populations. This game represents habitat variety, but real planning must also map actual routes and barriers.",
      mission: "Maintain three different habitat buildings while wildlife and biodiversity are both at least 70.",
      test: () => ["sanctuary", "orchard", "park", "apiary", "rain_garden"].filter(type => countBuilding(type) > 0).length >= 3
        && state.ecosystem.wildlife >= 70 && state.ecosystem.biodiversity >= 70
    },
    {
      id: "circular_materials",
      icon: "↺",
      title: "Keep materials in a cycle",
      principle: "A circular system reduces extraction by avoiding waste, reusing materials and returning safe biological nutrients to living systems.",
      realWorld: "The waste hierarchy usually prioritises prevention, reuse and repair before recycling, energy recovery or disposal.",
      mission: "Operate a Storehouse, Compost Yard and Wood Farm in the same village.",
      test: () => countBuilding("storage") > 0 && countBuilding("compost") > 0 && countBuilding("wood_farm") > 0
    },
    {
      id: "one_health",
      icon: "+",
      title: "Connect environmental and human health",
      principle: "Human health, animal health and ecosystem health are linked through water, air, food, disease and shared environments.",
      realWorld: "The One Health approach brings health workers, veterinarians, ecologists and communities together to prevent risks across those connections.",
      mission: "Operate a Clinic with health, water quality and clean air all at 80 or higher.",
      test: () => countBuilding("clinic") > 0 && state.health >= 80 && state.ecosystem.water >= 80 && state.ecosystem.air >= 80
    },
    {
      id: "nature_based_solutions",
      icon: "≈",
      title: "Use nature-based solutions",
      principle: "Healthy ecosystems can reduce hazards while supporting biodiversity, but they complement rather than replace careful infrastructure and emergency planning.",
      realWorld: "Wetlands can store floodwater, vegetation can cool neighbourhoods and living shorelines can reduce erosion while creating habitat.",
      mission: "Maintain a Rain Garden, Wild Sanctuary and Town Park with water and soil at 75 or higher.",
      test: () => ["rain_garden", "sanctuary", "park"].every(type => countBuilding(type) > 0)
        && state.ecosystem.water >= 75 && state.ecosystem.soil >= 75
    },
    {
      id: "future_generations",
      icon: "↟",
      title: "Plan across generations",
      principle: "Intergenerational fairness means meeting present needs without transferring depleted resources, pollution and fewer choices to future people.",
      realWorld: "Long-lived environmental decisions should consider who receives the benefits, who carries the risks and whether future communities can reverse the choice.",
      mission: "Reach Day 30 with a School, at least one child and an 80+ ecosystem.",
      test: () => state.day >= 30 && countBuilding("school") > 0 && state.demographics.children >= 1 && ecosystemScore() >= 80
    }
  ];

  const KNOWLEDGE_QUESTIONS = [
    {
      id: "forest_connections",
      topic: "Forests",
      question: "Why can clearing many wild trees harm more than the forest-cover number?",
      choices: ["Only timber storage changes", "Wildlife loses habitat and exposed soil becomes less stable", "Rain immediately stops everywhere"],
      correct: 1,
      explanation: "A forest is habitat and protective cover as well as timber. Removing it can also reduce wildlife, biodiversity and soil stability."
    },
    {
      id: "crop_zoning",
      topic: "Pollution",
      question: "A Workshop is reducing a nearby Farm’s harvest and its noise reaches occupied homes. What is the most direct protective action?",
      choices: ["Add more homes and Farms beside it", "Move or place the Workshop farther from crops and homes", "Cut the surrounding forest"],
      correct: 1,
      explanation: "Local pollution can be reduced through zoning. Separating loud, dirty industry from crops and homes protects food and people without pretending the pollution has disappeared."
    },
    {
      id: "biodiversity_meaning",
      topic: "Biodiversity",
      question: "What does biodiversity describe?",
      choices: ["Only the number of trees", "The amount of stored food", "The variety of species, habitats and ecological relationships"],
      correct: 2,
      explanation: "Biodiversity includes variety across life and habitat. Diverse systems are usually better able to recover from disturbances."
    },
    {
      id: "groundwater",
      topic: "Water",
      question: "Why can building many Wells become a problem even when each one supplies clean water?",
      choices: ["Groundwater can be drawn faster than the water cycle replenishes it", "Wells always poison crops", "Water has no connection to weather"],
      correct: 0,
      explanation: "Groundwater is renewable only within limits. Heavy extraction can exceed slow recharge from rain, soil and waterways."
    },
    {
      id: "managed_forest",
      topic: "Forestry",
      question: "What is the main environmental limitation of a Wood Farm?",
      choices: ["Its trees never regrow", "It supplies managed timber but does not replace the habitat variety of wild forest", "It automatically pollutes every Farm"],
      correct: 1,
      explanation: "A Wood Farm can reduce pressure on wild trees, but uniform managed planting is not the same as a complex natural habitat."
    },
    {
      id: "compost_cycle",
      topic: "Soil",
      question: "How does compost help protect future food production?",
      choices: ["It returns organic matter and nutrients to soil", "It turns stone directly into food", "It removes the need for water"],
      correct: 0,
      explanation: "Compost closes part of the nutrient cycle. Organic matter supports soil organisms, fertility and water retention."
    },
    {
      id: "storage_limits",
      topic: "Resources",
      question: "What can a Storehouse do—and what can it not do?",
      choices: ["It creates resources without environmental cost", "It stores more supplies, but does not create them or restore nature", "It prevents every future shortage"],
      correct: 1,
      explanation: "Storage reduces overflow and helps prepare for bad seasons. The village must still produce supplies within ecological limits."
    },
    {
      id: "resilience",
      topic: "Resilience",
      question: "Which plan best protects a growing village for the long term?",
      choices: ["Maximise one resource and ignore the other indicators", "Wait for collapse before restoring anything", "Monitor connected indicators, diversify solutions and adapt before limits are crossed"],
      correct: 2,
      explanation: "Resilience comes from diversity, feedback and early adaptation. Protecting several connected systems is safer than relying on one strong number."
    },
    {
      id: "night_cycles",
      topic: "Day and night",
      question: "Why can village resource rates change sharply after workers enter their homes?",
      choices: ["The ecosystem disappears at night", "Staffed output pauses, while consumption and automatic systems continue", "Every stored resource is discarded at sunset"],
      correct: 1,
      explanation: "Human work follows a daily rhythm. Staffed buildings pause overnight, but people still consume supplies and worker-free or natural processes keep running."
    },
    {
      id: "food_web_cascade",
      topic: "Food webs",
      question: "What is a trophic cascade?",
      choices: ["Rain moving downhill", "One crop being stored in several buildings", "A change to one part of a food web causing effects across other species"],
      correct: 2,
      explanation: "Species are connected by feeding relationships. Removing habitat, prey or predators can produce indirect changes throughout a food web."
    },
    {
      id: "ecosystem_services",
      topic: "Ecosystem services",
      question: "Pollination, water filtration and soil formation are examples of what?",
      choices: ["Ecosystem services that support life and economies", "Resources created only by Storehouses", "Forms of industrial pollution"],
      correct: 0,
      explanation: "Ecosystem services are benefits produced by living systems. Economies depend on them even when they do not appear as a priced resource."
    },
    {
      id: "sustainable_yield",
      topic: "Renewable resources",
      question: "When is harvesting a renewable resource most likely to be sustainable?",
      choices: ["Whenever demand is high", "When removal stays within the resource’s rate of regrowth and recovery", "When all of it is harvested at once"],
      correct: 1,
      explanation: "Renewable does not mean unlimited. A population or forest declines when harvesting repeatedly exceeds its ability to replace what was removed."
    },
    {
      id: "carrying_capacity_question",
      topic: "Carrying capacity",
      question: "What does environmental carrying capacity describe?",
      choices: ["The number of items one worker carries", "The size of the map", "The population an environment can support over time within its limits"],
      correct: 2,
      explanation: "Carrying capacity depends on resources, habitat, waste, technology and consumption. Exceeding it for long enough causes shortages and ecological decline."
    },
    {
      id: "prevention_restoration",
      topic: "Pollution",
      question: "Why is preventing pollution usually stronger than relying only on restoration?",
      choices: ["Prevention avoids damage that may be slow, costly or impossible to fully reverse", "Restoration always makes pollution larger", "Prevention removes the need for ecosystems"],
      correct: 0,
      explanation: "Restoration matters, but some species, soils and water systems recover slowly or incompletely. Avoiding damage protects more options for the future."
    },
    {
      id: "weather_climate",
      topic: "Weather and seasons",
      question: "How is a short thunderstorm different from a seasonal pattern?",
      choices: ["A storm has no environmental effects", "A storm is a short event; a season changes typical conditions over a longer period", "Seasons last only a few hours"],
      correct: 1,
      explanation: "Weather describes short-term conditions. Seasonal and climate patterns describe longer-term tendencies that shape water demand, growth and risk."
    },
    {
      id: "technology_lifecycle",
      topic: "Clean technology",
      question: "Why can a Windmill be cleaner without being impact-free?",
      choices: ["It secretly burns all stored timber", "Clean technology never changes production", "It avoids fuel combustion but still requires materials, construction and land"],
      correct: 2,
      explanation: "Life-cycle thinking considers extraction, construction, operation and disposal. Cleaner operation is valuable, while its remaining impacts still need planning."
    },
    {
      id: "threshold_precaution",
      topic: "Ecological thresholds",
      question: "Why should a steward act before an uncertain ecological threshold is crossed?",
      choices: ["Crossing it always creates free resources", "Feedbacks may accelerate damage and make recovery harder", "Every threshold is known with perfect accuracy"],
      correct: 1,
      explanation: "Some changes become self-reinforcing after a threshold. Because the exact boundary may be uncertain, early prevention preserves more options."
    },
    {
      id: "habitat_fragmentation",
      topic: "Habitat connectivity",
      question: "Why can several isolated green patches protect fewer species than a connected habitat network?",
      choices: ["Animals and seeds may be unable to move safely between food, shelter and breeding areas", "Connected habitat contains no plants", "Isolation always increases genetic diversity"],
      correct: 0,
      explanation: "Fragmentation can trap small populations and block seasonal movement. Corridors and safe stepping stones reconnect essential habitat."
    },
    {
      id: "waste_hierarchy",
      topic: "Circular materials",
      question: "Which action usually comes first in the waste hierarchy?",
      choices: ["Prevent unnecessary material use and waste", "Dispose of everything immediately", "Extract more raw material to fill storage"],
      correct: 0,
      explanation: "Avoiding waste prevents the impacts of extraction and processing. Reuse, repair and recycling help with materials that are still needed."
    },
    {
      id: "one_health_question",
      topic: "One Health",
      question: "What does a One Health approach recognise?",
      choices: ["Only hospitals affect health", "Human, animal and ecosystem health are connected", "Wildlife and clean water have no relationship to disease"],
      correct: 1,
      explanation: "Water, air, food, habitats and disease pathways connect people, animals and ecosystems, so prevention often needs several kinds of expertise."
    },
    {
      id: "nature_based_solution",
      topic: "Nature-based solutions",
      question: "What makes a restored wetland a nature-based solution?",
      choices: ["It works with ecological processes to store water and create habitat", "It guarantees that floods can never happen", "It replaces every need for planning and infrastructure"],
      correct: 0,
      explanation: "Healthy wetlands can slow and store floodwater while supporting life. They reduce risk but still belong within a wider resilience plan."
    },
    {
      id: "model_literacy",
      topic: "Using environmental models",
      question: "Why is a 100% ecosystem score in this game not a complete real-world environmental assessment?",
      choices: ["Real ecosystems require many local measurements, relationships and uncertainties that a game simplifies", "Percentages cannot be displayed on screens", "A perfect score means every species has been counted"],
      correct: 0,
      explanation: "Models help us explore cause and effect, but their boundaries and assumptions matter. Real decisions also need field evidence, local knowledge and uncertainty analysis."
    }
  ];

  const ACHIEVEMENTS = [
    { id: "careless", icon: "!", name: "Careless", description: "Lose a settlement before reaching Day 50." },
    { id: "environmentalist", icon: "♧", name: "Environmentalist", description: "Let the village fade while the ecosystem remains at 85 or higher." },
    { id: "first_roots", icon: "⌂", name: "First Roots", description: "Complete the opening Steward’s Path." },
    { id: "growing_pains", icon: "↟", name: "Growing Pains", description: "Support a population of 25." },
    { id: "wild_refuge", icon: "✦", name: "Wild Refuge", description: "Maintain three Wild Sanctuaries at once." },
    { id: "full_circle", icon: "○", name: "Full Circle", description: "Survive all four seasons and reach Day 49." },
    { id: "balanced_harvest", icon: "≈", name: "Balanced Harvest", description: "Reach Day 31 without the ecosystem ever falling below 70." },
    { id: "rewilder", icon: "♣", name: "Rewilder", description: "Recover the ecosystem from below 40 to at least 80." },
    { id: "mini_city", icon: "⚑", name: "Mini City", description: "Reach 75 people, build a Town Hall, and keep the ecosystem at 70+." },
    { id: "bright_future", icon: "▤", name: "Bright Future", description: "Provide a school place for every child and raise village education to 70." },
    { id: "century", icon: "100", name: "Century of Care", description: "Keep a settlement alive through Day 100." },
    { id: "perfect_balance", icon: "◎", name: "Perfect Balance", description: "Reach a displayed 100% ecosystem score on Harsh difficulty." }
  ];

  const OBJECTIVE_CHAPTERS = [
    {
      title: "Steward’s path",
      intro: "Build the foundations of a village without wounding the land.",
      goals: [
        { label: "Build a Cottage", test: () => countBuilding("cottage") >= 1 },
        { label: "Build a Field Farm", test: () => countBuilding("farm") >= 1 },
        { label: "Build a Village Well", test: () => countBuilding("well") >= 1 },
        { label: "Reach Day 3 with 80+ ecosystem", test: () => state.day >= 3 && ecosystemScore() >= 80 }
      ],
      reward: { food: 35, wood: 18 }
    },
    {
      title: "A living economy",
      intro: "Grow beyond the first camp while making room for forest recovery.",
      goals: [
        { label: "Support 18 people", test: () => state.population >= 18 },
        { label: "Build a Village School", test: () => countBuilding("school") >= 1 },
        { label: "Build a Forester’s Hut", test: () => countBuilding("forester") >= 1 },
        { label: "Store 180 food", test: () => state.resources.food >= 180 },
        { label: "Keep the ecosystem at 75+", test: () => ecosystemScore() >= 75 }
      ],
      reward: { wood: 25, stone: 25, water: 30 }
    },
    {
      title: "Weather the year",
      intro: "Prepare a resilient settlement that can endure every season.",
      goals: [
        { label: "Create a Wild Sanctuary", test: () => countBuilding("sanctuary") >= 1 },
        { label: "Support 30 people", test: () => state.population >= 30 },
        { label: "Reach the second spring (Day 49)", test: () => state.day >= 49 },
        { label: "Keep the ecosystem at 65+", test: () => ecosystemScore() >= 65 }
      ],
      reward: { food: 80, wood: 45, stone: 35 }
    },
    {
      title: "A city among trees",
      intro: "Prove that a thriving miniature city and a living forest can coexist.",
      goals: [
        { label: "Support 75 people", test: () => state.population >= 75 },
        { label: "Build a Town Hall", test: () => countBuilding("townhall") >= 1 },
        { label: "Reach Day 75", test: () => state.day >= 75 },
        { label: "Keep the ecosystem at 70+", test: () => ecosystemScore() >= 70 }
      ],
      reward: { food: 150, wood: 90, stone: 70 }
    },
    {
      title: "A living legacy",
      intro: "Make the final measure of success a whole, self-renewing ecosystem—not growth alone.",
      goals: [
        { label: "Reach Day 100", test: () => state.day >= 100 },
        { label: "Maintain a Compost Yard, Rain Garden, Wild Sanctuary and Town Park", test: () => ["compost", "rain_garden", "sanctuary", "park"].every(type => countBuilding(type) >= 1) },
        { label: "Restore every ecosystem indicator to 90+", test: () => Math.min(...Object.values(state.ecosystem)) >= 90 },
        { label: "Reach a 100% ecosystem score", test: () => isPerfectEcosystem() }
      ],
      reward: { food: 180, water: 180, wood: 100, stone: 100 }
    }
  ];

  const SCENARIOS = [
    {
      id: "winter_watch",
      icon: "❄",
      name: "Winter Watch",
      villageName: "Frostwillow",
      difficulty: "balanced",
      day: 34,
      dayProgress: 0.42,
      weather: "wind",
      seed: 0x5a17c2d1,
      population: 18,
      demographics: { children: 3, adults: 13, elders: 2 },
      education: 48,
      health: 84,
      happiness: 74,
      resources: { food: 148, water: 172, wood: 82, stone: 58 },
      ecosystem: { forest: 82, wildlife: 78, water: 84, soil: 73, air: 90, biodiversity: 79 },
      brief: "Autumn is almost over. Turn a working homestead into a storehouse strong enough to survive winter and greet the second spring.",
      learningGoal: "Seasonal resilience: build reserves and diversity before a predictable low-production period begins.",
      buildings: [
        ["hearth", 49, 49], ["cottage", 45, 47], ["cottage", 54, 49], ["farm", 42, 52],
        ["farm", 53, 54], ["well", 49, 45], ["granary", 46, 55], ["forester", 56, 44], ["school", 42, 44]
      ],
      goals: [
        { label: "Reach the second spring (Day 49)", test: () => state.day >= 49 },
        { label: "Store 220 food", test: () => state.resources.food >= 220 },
        { label: "Store 140 timber", test: () => state.resources.wood >= 140 },
        { label: "Keep the ecosystem at 75+", test: () => ecosystemScore() >= 75 }
      ],
      reward: { food: 90, wood: 55, stone: 30 }
    },
    {
      id: "dry_river",
      icon: "≈",
      name: "The Dry River",
      villageName: "Reedscar",
      difficulty: "harsh",
      day: 18,
      dayProgress: 0.62,
      weather: "drought",
      seed: 0x7b31e4a9,
      population: 22,
      demographics: { children: 5, adults: 15, elders: 2 },
      education: 43,
      health: 71,
      happiness: 62,
      resources: { food: 136, water: 54, wood: 128, stone: 96 },
      ecosystem: { forest: 78, wildlife: 69, water: 44, soil: 61, air: 88, biodiversity: 67 },
      dryRiverRefillAt: 30,
      brief: "A summer drought has exposed the riverbed. Rebuild the village around captured rain before its wells and wetlands fail.",
      learningGoal: "Watershed limits: compare extraction with recharge and use nature-based systems to slow, store and clean rainfall.",
      buildings: [
        ["hearth", 49, 49], ["cottage", 44, 47], ["cottage", 54, 48], ["cottage", 47, 55],
        ["farm", 41, 52], ["farm", 53, 54], ["well", 49, 45], ["well", 53, 45],
        ["rain_garden", 43, 44], ["reservoir", 55, 43], ["school", 42, 57]
      ],
      goals: [
        { label: "Restore water quality to 70+", test: () => state.ecosystem.water >= 70 },
        { label: "Store 220 water", test: () => state.resources.water >= 220 },
        { label: "Maintain two Rain Gardens", test: () => countBuilding("rain_garden") >= 2 },
        { label: "Survive to Day 29", test: () => state.day >= 29 }
      ],
      reward: { water: 140, food: 70, stone: 35 }
    },
    {
      id: "timber_debt",
      icon: "▥",
      name: "Timber Debt",
      villageName: "Axeholm",
      difficulty: "balanced",
      day: 27,
      dayProgress: 0.28,
      weather: "rain",
      seed: 0x3d91a7f2,
      population: 28,
      demographics: { children: 4, adults: 21, elders: 3 },
      education: 39,
      health: 78,
      happiness: 58,
      resources: { food: 186, water: 194, wood: 238, stone: 82 },
      ecosystem: { forest: 46, wildlife: 51, water: 68, soil: 59, air: 77, biodiversity: 48 },
      loggedTreeCount: 42,
      brief: "A profitable logging settlement has exhausted the woods around its camps. Pay down its timber debt and make the forest self-renewing.",
      learningGoal: "Ecological debt: past extraction can leave delayed costs, and replacing timber supply is not the same as restoring wild habitat.",
      buildings: [
        ["hearth", 49, 49], ["cottage", 44, 46], ["cottage", 54, 48], ["cottage", 47, 55],
        ["lumber", 39, 49], ["lumber", 57, 49], ["farm", 42, 53], ["farm", 53, 54],
        ["well", 49, 45], ["granary", 43, 43], ["forester", 55, 44]
      ],
      goals: [
        { label: "Retire every Logging Camp", test: () => countBuilding("lumber") === 0 },
        { label: "Maintain two Forester’s Huts", test: () => countBuilding("forester") >= 2 },
        { label: "Restore forest cover to 72+", test: () => state.ecosystem.forest >= 72 },
        { label: "Survive to Day 43", test: () => state.day >= 43 }
      ],
      reward: { wood: 120, food: 85, stone: 40 }
    },
    {
      id: "smoke_valley",
      icon: "⚒",
      name: "Smoke Valley",
      villageName: "Cinderbrook",
      difficulty: "harsh",
      day: 42,
      dayProgress: 0.7,
      weather: "snow",
      seed: 0x24cb6d81,
      population: 42,
      demographics: { children: 8, adults: 30, elders: 4 },
      education: 56,
      health: 67,
      happiness: 55,
      resources: { food: 242, water: 255, wood: 188, stone: 168 },
      ecosystem: { forest: 63, wildlife: 56, water: 58, soil: 52, air: 47, biodiversity: 54 },
      brief: "Industry was built against fields and forest. Clear the smoke, separate dirty work from food, and bring living space back into the settlement.",
      learningGoal: "Pollution prevention: trace who is exposed, separate incompatible land uses and reduce harm at its source.",
      buildings: [
        ["hearth", 49, 49], ["townhouse", 45, 47], ["townhouse", 54, 48], ["farm", 42, 53],
        ["orchard", 52, 54], ["workshop", 39, 51], ["quarry", 56, 52], ["well", 49, 45],
        ["reservoir", 47, 57], ["school", 42, 44], ["clinic", 55, 44], ["granary", 45, 57]
      ],
      goals: [
        { label: "Reduce every crop’s pollution loss below 5%", test: () => {
          const crops = state.buildings.filter(building => ["farm", "orchard"].includes(building.type));
          return crops.length > 0 && crops.every(crop => getCropPollutionInfo(crop).penalty < 0.05);
        } },
        { label: "Restore clean air to 60+", test: () => state.ecosystem.air >= 60 },
        { label: "Maintain two Town Parks", test: () => countBuilding("park") >= 2 },
        { label: "Reach Day 55 with a 65+ ecosystem", test: () => state.day >= 55 && ecosystemScore() >= 65 }
      ],
      reward: { food: 110, water: 100, wood: 55, stone: 55 }
    },
    {
      id: "burned_watershed",
      icon: "ϟ",
      name: "After the Fire",
      villageName: "Emberford",
      difficulty: "balanced",
      restoration: true,
      day: 13,
      dayProgress: 0.38,
      weather: "rain",
      seed: 0x6ac391e5,
      population: 22,
      demographics: { children: 5, adults: 15, elders: 2 },
      education: 41,
      health: 63,
      happiness: 52,
      resources: { food: 146, water: 158, wood: 104, stone: 72 },
      ecosystem: { forest: 32, wildlife: 34, water: 37, soil: 29, air: 42, biodiversity: 31 },
      brief: "A severe fire stripped the upper catchment. Rain now carries ash and soil through a village whose ecosystem is below 40% and still falling by about 1% each day. Most fire-damaged trees remain permanently black and leafless and contain 30% less usable timber. Removing a stump also reveals adjacent treeless fire-scar ground as clearing, while creeks and the river remain protected.",
      learningGoal: "Post-fire recovery: protect damaged standing trees where possible, stop further disturbance, keep creek and river channels connected, slow runoff and restore soil, vegetation and habitat together rather than replacing only the lost timber.",
      crisisLabel: "Post-fire erosion and habitat loss",
      crisisPressure: { forest: -1.2, wildlife: -1, water: -1.05, soil: -1.25, air: -0.75, biodiversity: -1.05 },
      crisisResolution: "Retire every Logging Camp, maintain two Rain Gardens and build a Compost Yard.",
      crisisResolved: () => countBuilding("lumber") === 0 && countBuilding("rain_garden") >= 2 && countBuilding("compost") >= 1,
      buildings: [
        ["hearth", 49, 49], ["cottage", 44, 47], ["cottage", 54, 48], ["farm", 42, 53],
        ["well", 49, 45], ["lumber", 39, 50], ["rain_garden", 55, 44], ["storage", 47, 56], ["forester", 56, 53]
      ],
      goals: [
        { label: "Retire every Logging Camp", test: () => countBuilding("lumber") === 0 },
        { label: "Maintain two Rain Gardens and a Compost Yard", test: () => countBuilding("rain_garden") >= 2 && countBuilding("compost") >= 1 },
        { label: "Restore forest cover and soil health to 65+", test: () => state.ecosystem.forest >= 65 && state.ecosystem.soil >= 65 },
        { label: "Reach Day 30 with a 60+ ecosystem", test: () => state.day >= 30 && ecosystemScore() >= 60 }
      ],
      reward: { food: 120, water: 140, wood: 70, stone: 55 }
    },
    {
      id: "poisoned_river",
      icon: "≈",
      name: "The Poisoned River",
      villageName: "Greywater",
      difficulty: "harsh",
      restoration: true,
      day: 30,
      dayProgress: 0.58,
      weather: "cloudy",
      seed: 0x47d2ba91,
      population: 34,
      demographics: { children: 7, adults: 24, elders: 3 },
      education: 49,
      health: 52,
      happiness: 46,
      resources: { food: 212, water: 112, wood: 176, stone: 142 },
      ecosystem: { forest: 44, wildlife: 34, water: 31, soil: 30, air: 28, biodiversity: 27 },
      brief: "Quarry tailings and workshop waste have entered the river. The ecosystem is below 40%, public health is suffering and contamination is spreading by about 1% each day.",
      learningGoal: "Pollution cleanup: remove the continuing source first, then use filtration, living soil and habitat restoration to repair a damaged watershed.",
      crisisLabel: "Toxic runoff moving through the watershed",
      crisisPressure: { forest: -0.35, wildlife: -0.55, water: -1.15, soil: -0.85, air: -0.85, biodiversity: -0.75 },
      crisisResolution: "Retire every Workshop and Quarry, then maintain two Rain Gardens and a Compost Yard.",
      crisisResolved: () => countBuilding("workshop") === 0 && countBuilding("quarry") === 0 && countBuilding("rain_garden") >= 2 && countBuilding("compost") >= 1,
      buildings: [
        ["hearth", 49, 49], ["townhouse", 44, 47], ["cottage", 55, 48], ["farm", 42, 53],
        ["workshop", 38, 50], ["quarry", 56, 52], ["well", 49, 45], ["reservoir", 47, 57],
        ["rain_garden", 55, 44], ["clinic", 42, 44], ["school", 55, 56]
      ],
      goals: [
        { label: "Retire every Civic Workshop and Stone Quarry", test: () => countBuilding("workshop") === 0 && countBuilding("quarry") === 0 },
        { label: "Maintain two Rain Gardens and a Compost Yard", test: () => countBuilding("rain_garden") >= 2 && countBuilding("compost") >= 1 },
        { label: "Restore water, soil and clean air to 65+", test: () => state.ecosystem.water >= 65 && state.ecosystem.soil >= 65 && state.ecosystem.air >= 65 },
        { label: "Reach Day 48 with a 60+ ecosystem", test: () => state.day >= 48 && ecosystemScore() >= 60 }
      ],
      reward: { food: 150, water: 180, wood: 85, stone: 70 }
    },
    {
      id: "silent_fields",
      icon: "✿",
      name: "The Silent Fields",
      villageName: "Beechmere",
      difficulty: "harsh",
      restoration: true,
      day: 24,
      dayProgress: 0.46,
      weather: "mild",
      seed: 0x31ef84c7,
      population: 26,
      demographics: { children: 6, adults: 18, elders: 2 },
      education: 46,
      health: 69,
      happiness: 48,
      resources: { food: 168, water: 184, wood: 132, stone: 88 },
      ecosystem: { forest: 41, wildlife: 24, water: 48, soil: 42, air: 58, biodiversity: 20 },
      brief: "Years of hunting, habitat fragmentation and broad pesticide use have emptied the fields of birds and insects. The ecosystem is below 40% and falling about 1% each day.",
      learningGoal: "Food-web restoration: remove direct wildlife pressure, reconnect varied habitat and restore pollinators instead of treating each missing species alone.",
      crisisLabel: "Habitat fragmentation and pesticide legacy",
      crisisPressure: { forest: -0.6, wildlife: -1.2, water: -0.45, soil: -0.65, air: -0.3, biodiversity: -1.3 },
      crisisResolution: "Retire every Hunter’s Lodge and maintain both a Wild Sanctuary and Wildflower Apiary.",
      crisisResolved: () => countBuilding("hunter") === 0 && countBuilding("sanctuary") >= 1 && countBuilding("apiary") >= 1,
      buildings: [
        ["hearth", 49, 49], ["cottage", 44, 47], ["cottage", 54, 48], ["cottage", 47, 56],
        ["farm", 41, 53], ["farm", 53, 54], ["orchard", 39, 44], ["hunter", 58, 49],
        ["well", 49, 45], ["apiary", 56, 44], ["school", 43, 57]
      ],
      goals: [
        { label: "Retire every Hunter’s Lodge", test: () => countBuilding("hunter") === 0 },
        { label: "Maintain two Wild Sanctuaries and an Apiary", test: () => countBuilding("sanctuary") >= 2 && countBuilding("apiary") >= 1 },
        { label: "Restore wildlife and biodiversity to 65+", test: () => state.ecosystem.wildlife >= 65 && state.ecosystem.biodiversity >= 65 },
        { label: "Reach Day 42 with a 60+ ecosystem", test: () => state.day >= 42 && ecosystemScore() >= 60 }
      ],
      reward: { food: 160, water: 120, wood: 75, stone: 55 }
    },
    {
      id: "green_city",
      icon: "⚑",
      name: "The Green City",
      villageName: "Canopy Cross",
      difficulty: "harsh",
      day: 70,
      dayProgress: 0.36,
      weather: "heatwave",
      seed: 0x19a5df73,
      population: 68,
      demographics: { children: 12, adults: 50, elders: 6 },
      education: 72,
      health: 74,
      happiness: 68,
      resources: { food: 410, water: 365, wood: 330, stone: 286 },
      ecosystem: { forest: 76, wildlife: 71, water: 67, soil: 65, air: 72, biodiversity: 70 },
      brief: "A miniature city now fills the clearing. Prove that density, education and restored habitat can carry it into a greener future.",
      learningGoal: "Urban sustainability: compact growth can save land only when infrastructure, equity and ecosystem services grow with the population.",
      buildings: [
        ["hearth", 49, 49], ["townhouse", 44, 46], ["townhouse", 54, 47], ["townhouse", 47, 55],
        ["cottage", 41, 51], ["cottage", 57, 51], ["farm", 40, 54], ["farm", 53, 55],
        ["townhall", 47, 42], ["market", 54, 43], ["school", 41, 44], ["school", 57, 45],
        ["reservoir", 43, 57], ["granary", 53, 59], ["storage", 60, 48], ["windmill", 59, 53], ["workshop", 38, 48],
        ["park", 56, 57], ["sanctuary", 38, 57]
      ],
      goals: [
        { label: "Support 75 people", test: () => state.population >= 75 },
        { label: "Raise education to 80+", test: () => state.education >= 80 },
        { label: "Maintain two Wild Sanctuaries", test: () => countBuilding("sanctuary") >= 2 },
        { label: "Reach Day 90 with a 75+ ecosystem", test: () => state.day >= 90 && ecosystemScore() >= 75 }
      ],
      reward: { food: 180, water: 150, wood: 100, stone: 100 }
    }
  ];

  const BLOG_POSTS = [
    {
      title: "Welcome to the clearing",
      body: "Your founders have opened an irregular clearing inside a 100 × 100 ancient forest. Grow their village for as long as you can—but if the overall ecosystem falls below 5%, or any one of its six indicators reaches 0%, the settlement is lost with it.",
      tip: "The game begins paused. Nothing changes until you finish this lesson. Protect weak links as carefully as the overall score.",
      art: "radial-gradient(circle at 50% 44%, rgba(139,190,111,.5) 0 12%, transparent 13%), repeating-radial-gradient(circle at 50% 48%, #315f3e 0 8px, #234b32 9px 18px)"
    },
    {
      title: "Read the living system",
      body: "Forest, wildlife, water, soil, air and biodiversity support one another. The ecosystem score combines all six, but a weak link can still damage harvests, health and recovery.",
      tip: "Logging may solve today’s timber shortage while causing tomorrow’s wildlife and soil crisis.",
      art: "conic-gradient(from 25deg at 50% 50%, #6fa868, #3f7863, #74a9b0, #a88550, #6fa868)"
    },
    {
      title: "Learn from cause and effect",
      body: "The Eco Coach reads the village’s real ecosystem values and full 24-hour average rates. It points to the weakest or fastest-falling part of the system without flipping its advice at night, then connects that change to actions available in the game.",
      tip: "The Coach now names the strongest pressure and support behind its trend. Open the Environmental Field Guide for twenty practical missions, six live indicator explanations and twenty-two optional knowledge checks.",
      art: "radial-gradient(circle at 50% 45%, rgba(166,220,129,.5) 0 8%, transparent 9%), repeating-conic-gradient(from 10deg at 50% 50%, rgba(115,177,103,.55) 0 10deg, transparent 10deg 28deg), linear-gradient(#244f3c,#102f24)"
    },
    {
      title: "Build with consequences",
      body: "Choose a building from the planning desk, then click enough connected clearing tiles for its footprint. Plans are ordered by citizens required, then alphabetically. Buildings have different sizes, and every construction disturbs the land immediately.",
      tip: "Start with a Cottage, Field Farm and Village Well. Creeks and rivers block ordinary construction and walking: clear both banks, then rotate the matching bridge across the water. Press O/P to rotate, drag to pan, and scroll to zoom.",
      art: "linear-gradient(30deg, transparent 48%, rgba(237,210,142,.45) 49% 52%, transparent 53%), repeating-linear-gradient(90deg, #315d3b 0 24px, #396b42 25px 48px)"
    },
    {
      title: "Every villager has a life",
      body: "Every moving resident has a name, life stage, age and destination. Natural death ages vary privately from 40–60 game days, while members of travelling families remain for 20–40 days after arrival. Workers fill real job slots, carry one to three items, and return inside their homes at night. Inspect a workplace or citizen to set Low, Normal or High work priority.",
      tip: "Required jobs always fill before optional helpers; within each tier, high-priority workplaces and citizens are considered first. A Farm’s third worker raises output and pressure to 2×, while a Rain Garden keeps its automatic baseline without staff.",
      art: "radial-gradient(circle at 35% 44%, #d7c39a 0 4%, transparent 5%), radial-gradient(circle at 52% 39%, #d7c39a 0 5%, transparent 6%), radial-gradient(circle at 69% 46%, #d7c39a 0 4%, transparent 5%), linear-gradient(90deg, transparent 0 27%, #8b5c49 28% 42%, transparent 43% 46%, #547261 47% 61%, transparent 62% 66%, #8e7758 67% 80%, transparent 81%), linear-gradient(#315d3b, #173a28)"
    },
    {
      title: "Distance changes the outcome",
      body: "A full two-person Logging Camp crew takes five base hours to fell a tree outside its circular 15 × 15 zone and works 10× faster inside it, giving a 30-minute base time. When its local forest is exhausted, the camp travels to the nearest outside-zone tree. Stumps match the tree speed at their location. Weather, illness, education and staffing can change the exact duration.",
      tip: "Long-hold a standing tree to toggle its gold priority marker; hold it again to return it to the normal queue. Mature Wood Farm plots are taken before unmarked wild trees. Keep occupied homes outside the purple five-tile noise buffer.",
      art: "radial-gradient(circle at 30% 52%, transparent 0 20%, rgba(225,169,93,.48) 21% 23%, transparent 24%), radial-gradient(circle at 72% 48%, rgba(122,91,72,.52) 0 15%, transparent 16%), linear-gradient(90deg, #244f35 0 48%, #6f633d 49% 68%, #2a4b32 69%)"
    },
    {
      title: "Time, weather and seasons",
      body: "One day lasts three real minutes at 1×. Weather follows condition-specific timescales: a thunderstorm lasts about two in-game hours, cloudy systems about four days, and heatwaves about three days. Deciduous trees colour gradually, shed during autumn’s final three days, remain bare in winter, and grow their canopy back during spring’s first three days. Rivers and creeks freeze for the whole winter, whatever the day’s weather.",
      tip: "One tree in ten is an evergreen that stays green all year. Ice can hide moving water and vary in strength, so villagers still use bridges. Weather freezes while paused; seasonal changes follow the calendar.",
      art: "linear-gradient(90deg, rgba(127,190,108,.75) 0 25%, rgba(220,186,91,.72) 25% 50%, rgba(194,113,65,.72) 50% 75%, rgba(155,198,207,.76) 75%)"
    },
    {
      title: "Use the model—and question it",
      body: "The six ecosystem scores and their /day forecasts compress complex living systems into a playable model. They are useful for exploring feedback and trade-offs, but real ecosystems cannot be fully measured by six numbers.",
      tip: "Good environmental reasoning asks what a model includes, what it leaves out, how uncertain the evidence is, who experiences the effects, and what field observations or local and Indigenous knowledge are needed.",
      art: "radial-gradient(circle at 50% 50%, transparent 0 18%, rgba(131,200,120,.5) 19% 21%, transparent 22% 32%, rgba(228,189,101,.4) 33% 35%, transparent 36%), linear-gradient(135deg, #274f3b, #112e24)"
    },
    {
      title: "There is no perfect choice",
      body: "Events become stronger and tend to become more frequent as time passes and difficulty rises. Their random spacing can range from three events in one day to only one in seven days. Fires, floods, illness and ecological changes test different kinds of resilience.",
      tip: "Five Steward’s Path chapters lead to A Living Legacy: restore the whole ecosystem, not growth alone. Reaching a displayed 100% ecosystem on Harsh also unlocks Perfect Balance. Good luck, Steward.",
      art: "radial-gradient(circle at 50% 45%, #b5df8a 0 8%, transparent 9%), radial-gradient(circle at 50% 50%, transparent 0 24%, #44794e 25% 29%, transparent 30%), linear-gradient(#234f3a, #102c21)"
    }
  ];

  const PLACEMENT_TUTORIAL_STEPS = [
    { title: "How building placement works", body: "Open the Planning Desk on the left, choose a building, then move your cursor over the map. The highlighted footprint shows every tile it needs. Click only when the whole shape is on connected clearing: forest, water, existing buildings and villagers’ paths cannot be built over.", tip: "Read each building card first: it shows the cost, footprint, job slots and impact. Press O or P before clicking to rotate a building; drag to pan and scroll to zoom.", art: "linear-gradient(30deg, transparent 48%, rgba(237,210,142,.45) 49% 52%, transparent 53%), repeating-linear-gradient(90deg, #315d3b 0 24px, #396b42 25px 48px)" },
    { title: "1. Place a Cottage", body: "Choose Cottage from the Village section. It needs a clear 2 × 2 square and costs 18 timber and 5 stone. Place it near the Founders’ Hearth so new residents have a home, but leave room around it for future services and paths.", tip: "Keep homes away from the purple noise zones of a Logging Camp or Stone Quarry. A Cottage has no workers to assign—it simply adds six homes.", art: "radial-gradient(circle at 50% 48%, #d7c39a 0 13%, transparent 14%), linear-gradient(135deg, #315d3b 0 48%, #8b5c49 49% 68%, #173a28 69%)" },
    { title: "2. Place a Field Farm and Well", body: "Choose Field Farm and find a 4 × 3 clear rectangle away from pollution. It costs 16 timber and 2 stone. Then place a 1 × 1 Village Well nearby for water; it costs 12 timber and 12 stone. The Farm needs two farmers for normal food output, while the Well works automatically.", tip: "Do not put Farms beside Logging Camps, Quarries or Workshops: their pollution reduces crop output. A third farmer doubles food output, but also doubles water use and ecological pressure.", art: "repeating-linear-gradient(90deg, #8a7942 0 10px, #a99a57 11px 20px), linear-gradient(#4d7d51, #244b32)" },
    { title: "3. Place your first Logging Camp", body: "Choose Logging Camp and place its 3 × 2 footprint on clearing beside—not on—the forest. Hovering shows its circular 15 × 15 work zone: place the circle over trees or a mature Wood Farm so the two loggers work 10× faster there.", tip: "Leave a five-tile buffer between the camp and occupied Cottages. It is noisy and removes habitat. Build only when you have storage room: full timber storage pauses the camp automatically.", art: "radial-gradient(circle at 34% 52%, transparent 0 24%, rgba(225,169,93,.58) 25% 27%, transparent 28%), linear-gradient(90deg, #244f35 0 50%, #735f3f 51% 70%, #2a4b32 71%)" },
    { title: "4. Place a Stone Quarry carefully", body: "Choose Stone Quarry and reserve a 4 × 3 clear rectangle well away from homes, Farms and waterways. It costs 20 timber and needs three workers. It makes stone, but its dust, noise and soil damage are serious local costs.", tip: "Treat a Quarry as a distant work site: use the map’s open edge, not the centre of your food-and-housing area. Inspect it after building to see exactly what it affects.", art: "linear-gradient(135deg, #5f6658 0 42%, #8b8066 43% 61%, #2b4c38 62%)" },
    { title: "5. Add a Storehouse before resources spill", body: "Choose Storehouse in Village and place its compact 2 × 2 footprint near the Hearth or production area. It costs 28 timber and 12 stone, needs no workers, and adds 200 capacity to food, water, timber and stone.", tip: "Watch the resource bars along the top. Production above a full resource limit is lost, so add storage before expanding a busy Farm, Camp or Quarry.", art: "linear-gradient(90deg, #3b5a3b 0 30%, #9b7a4e 31% 68%, #234533 69%)" },
    { title: "6. Protect space for a Wild Sanctuary", body: "Choose Wild Sanctuary in Nature when you can afford its 22 timber and 4 stone cost. It needs a 4 × 4 clear block and no workers. Place it next to remaining forest or other green spaces, away from pollution and heavy noise.", tip: "A Sanctuary restores forest, wildlife and biodiversity. Connecting it to wild land makes it a meaningful counterweight to the Camp, Quarry and Farm instead of an isolated decorative square.", art: "radial-gradient(circle at 50% 48%, rgba(153,215,124,.65) 0 25%, transparent 26%), linear-gradient(#315f3e, #173a28)" },
    { title: "A dependable first layout", body: "Build homes, food and water close together; put the Logging Camp and Stone Quarry out at the clearing’s edge; keep a Storehouse close to where supplies are used; and join Wild Sanctuaries to the forest. Select any building again to inspect its footprint, staffing and local effects.", tip: "Your first practical order: Cottage → Field Farm → Village Well → Logging Camp → Stone Quarry → Storehouse → Wild Sanctuary. Pause whenever you need to plan—good placement matters more than rushing.", art: "radial-gradient(circle at 22% 44%, #d7c39a 0 6%, transparent 7%), radial-gradient(circle at 50% 52%, #a99a57 0 15%, transparent 16%), radial-gradient(circle at 78% 42%, #8bc47c 0 13%, transparent 14%), linear-gradient(#315d3b, #173a28)" }
  ];

  let state;
  let gameActive = false;
  let selectedBuilding = null;
  let selectedRotation = 0;
  let activeTool = "inspect";
  let hoveredTile = null;
  let hoveredVillagerId = null;
  let achievements = {};
  let modalResume = false;
  let modalClosable = false;
  let lastFrameTime = performance.now();
  let pendingSimulationMs = 0;
  let lastMapDrawTime = 0;
  let mapInteractionUntil = 0;
  let fpsEnabled = false;
  let fpsSampleStartedAt = performance.now();
  let fpsLoopFrames = 0;
  let fpsMapFrames = 0;
  let terrainCacheCanvas = null;
  let terrainCacheKey = "";
  let lastUiTime = 0;
  let saveElapsed = 0;
  let mapMessageTimer = 0;
  let buildListSignature = "";
  let activeSaveSlot = 1;
  let mapGesture = null;
  let treePriorityTimer = 0;
  let weatherVisualTime = 0;
  let tutorialSuggestedPlacement = null;
  const weatherParticles = [];
  const villagers = [];
  let villagerSignature = "";
  let rosterDirty = true;
  let runtimeIndexState = null;
  let runtimePeopleRef = null;
  let runtimeBuildingsRef = null;
  let runtimePeopleLength = -1;
  let runtimeBuildingsLength = -1;
  let peopleById = new Map();
  let buildingsById = new Map();
  let assignedWorkerCounts = new Map();
  let lastVillagerDataUpdate = 0;
  let lastResidentLifecycleHour = -1;
  let nextResidentExpiry = Infinity;
  const remoteLoggingTargetCache = new Map();
  let standingWildTreeCountCache = null;

  const dom = {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function resetFpsCounter(now = performance.now()) {
    fpsSampleStartedAt = now;
    fpsLoopFrames = 0;
    fpsMapFrames = 0;
  }

  function toggleFpsOverlay() {
    fpsEnabled = !fpsEnabled;
    if (dom.fpsOverlay) {
      dom.fpsOverlay.hidden = !fpsEnabled;
      dom.fpsOverlay.textContent = fpsEnabled ? "FPS measuring…" : "";
    }
    resetFpsCounter();
    return `FPS overlay ${fpsEnabled ? "enabled" : "disabled"}.`;
  }

  function keepMapResponsive() {
    mapInteractionUntil = performance.now() + MAP_INTERACTION_SETTLE_MS;
  }

  function updateFpsOverlay(now, mapDrawn) {
    if (!fpsEnabled) return;
    fpsLoopFrames += 1;
    if (mapDrawn) fpsMapFrames += 1;
    const elapsed = now - fpsSampleStartedAt;
    if (elapsed < 500 || !dom.fpsOverlay) return;
    const loopFps = Math.round(fpsLoopFrames * 1000 / elapsed);
    const mapFps = Math.round(fpsMapFrames * 1000 / elapsed);
    dom.fpsOverlay.textContent = state?.paused
      ? `PAUSED · redraw ${mapFps} · loop ${loopFps}`
      : `FPS ${mapFps} · loop ${loopFps}`;
    resetFpsCounter(now);
  }

  function normaliseWorkPriority(value) {
    return WORK_PRIORITY_LEVELS.some(level => level.id === value) ? value : "normal";
  }

  function getWorkPriorityMeta(value) {
    const normalised = normaliseWorkPriority(value);
    return WORK_PRIORITY_LEVELS.find(level => level.id === normalised) || WORK_PRIORITY_LEVELS[1];
  }

  function getWorkPriorityRank(value) {
    return getWorkPriorityMeta(value).rank;
  }

  function workPriorityButtonsHtml(dataAttribute, value, ariaLabel) {
    const current = normaliseWorkPriority(value);
    return `<div class="work-priority-buttons" role="group" aria-label="${escapeHtml(ariaLabel)}">${WORK_PRIORITY_LEVELS.map(level => `
      <button class="work-priority-button ${current === level.id ? "active" : ""}" type="button" data-${dataAttribute}="${level.id}" aria-pressed="${current === level.id}"><span aria-hidden="true">${level.icon}</span>${level.label}</button>`).join("")}</div>`;
  }

  function tileIndex(x, y) {
    return y * WORLD_SIZE + x;
  }

  function inWorld(x, y) {
    return x >= 0 && y >= 0 && x < WORLD_SIZE && y < WORLD_SIZE;
  }

  function normaliseRotation(rotation = 0) {
    return ((Math.round(rotation) % 4) + 4) % 4;
  }

  function getBuildingSize(type, rotation = 0) {
    const base = BUILDINGS[type]?.size || { w: 1, h: 1 };
    return normaliseRotation(rotation) % 2 ? { w: base.h, h: base.w } : { ...base };
  }

  function getWaterwayTypeForState(target, x, y) {
    if (!inWorld(x, y)) return null;
    const type = target?.waterways?.[tileIndex(x, y)];
    return type === "river" || type === "creek" ? type : null;
  }

  function getWaterwayType(x, y) {
    return getWaterwayTypeForState(state, x, y);
  }

  function areScenarioWaterwaysDry(target = state) {
    const scenario = SCENARIOS.find(item => item.id === target?.scenarioId);
    return scenario?.id === "dry_river" && target?.dryRiverRefilled !== true;
  }

  function getDryRiverFlowProgress(target = state) {
    if (areScenarioWaterwaysDry(target) || !Number.isFinite(Number(target?.dryRiverGushStartedAt))) return 0;
    return clamp((getWorldTime(target) - target.dryRiverGushStartedAt) / DRY_RIVER_FLOW_DURATION_DAYS, 0, 1);
  }

  function isScenarioWaterwayDryAt(x, y, target = state) {
    const scenario = SCENARIOS.find(item => item.id === target?.scenarioId);
    return scenario?.id === "dry_river" && (areScenarioWaterwaysDry(target) || getDryRiverFlowProgress(target) < (y + 1) / WORLD_SIZE);
  }

  function getTerrainLabel(x, y, target = state) {
    const waterway = getWaterwayTypeForState(target, x, y);
    if (waterway) return waterway;
    return isClearingForState(target, x, y) ? "clearing" : "forest";
  }

  function initialiseWaterways(target, force = false) {
    if (!target || target.waterwaysInitialised === true && !force) return target?.waterways || {};
    const waterways = {};
    const seed = Number(target.terrainSeed) || 1;
    const phase = ((seed >>> 0) % 997) / 997 * Math.PI * 2;
    const riverCentreAt = y => clamp(Math.round(69 + Math.sin(y / 10.5 + phase) * 3.1 + Math.sin(y / 23 - phase * 0.7) * 1.15), 64, 75);

    // The main river runs north–south and is always three tiles wide, giving
    // the five-tile River Bridge one land tile on each bank.
    for (let y = 0; y < WORLD_SIZE; y++) {
      const centreX = riverCentreAt(y);
      for (let offset = -1; offset <= 1; offset++) waterways[tileIndex(centreX + offset, y)] = "river";
    }

    // Two one-tile tributaries cross the map outside the founders' clearing.
    for (let x = 0; x < WORLD_SIZE; x++) {
      const northY = clamp(Math.round(32 + Math.sin(x / 9 + phase * 0.8) * 1.7 + Math.sin(x / 21) * 0.7), 28, 36);
      const southY = clamp(Math.round(68 + Math.sin(x / 10.5 - phase) * 1.8 + Math.sin(x / 19 + phase) * 0.65), 64, 73);
      const northIndex = tileIndex(x, northY);
      const southIndex = tileIndex(x, southY);
      if (!waterways[northIndex]) waterways[northIndex] = "creek";
      if (!waterways[southIndex]) waterways[southIndex] = "creek";
    }

    // Older saves keep every existing non-bridge building. The channel bends
    // around those footprints once, then the saved map stays permanent.
    for (const building of target.buildings || []) {
      if (BUILDINGS[building.type]?.bridge) continue;
      const size = getBuildingSize(building.type, building.rotation);
      for (let dy = 0; dy < size.h; dy++) {
        for (let dx = 0; dx < size.w; dx++) delete waterways[tileIndex(building.x + dx, building.y + dy)];
      }
    }
    target.waterways = waterways;
    target.waterwaysInitialised = true;
    return waterways;
  }

  function isClearingForState(target, x, y) {
    if (!inWorld(x, y)) return false;
    if (getWaterwayTypeForState(target, x, y)) return false;
    if (target.clearedTiles?.[tileIndex(x, y)]) return true;
    const dx = x + 0.5 - WORLD_CENTER;
    const dy = y + 0.5 - WORLD_CENTER;
    const angle = Math.atan2(dy, dx);
    const rx = 11.7;
    const ry = 10.2;
    const distance = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    const phase = ((target.terrainSeed || 1) % 997) / 997 * Math.PI * 2;
    const edgeNoise = (seededNoise(x, y, target.terrainSeed || 1) - 0.5) * 0.08;
    const boundary = 1 + Math.sin(angle * 3 + phase) * 0.085 + Math.sin(angle * 5 - phase * 0.7) * 0.05 + edgeNoise;
    return distance <= boundary;
  }

  function isClearing(x, y) {
    return isClearingForState(state, x, y);
  }

  function rebuildOccupancy(target) {
    target.occupancy = Array(WORLD_SIZE * WORLD_SIZE).fill(0);
    for (const building of target.buildings || []) {
      building.rotation = normaliseRotation(building.rotation);
      const size = getBuildingSize(building.type, building.rotation);
      building.w = size.w;
      building.h = size.h;
      for (let dy = 0; dy < size.h; dy++) {
        for (let dx = 0; dx < size.w; dx++) {
          const x = building.x + dx;
          const y = building.y + dy;
          if (inWorld(x, y)) target.occupancy[tileIndex(x, y)] = building.id;
        }
      }
    }
  }

  function getBridgePlacementStatusForState(target, type, originX, originY, rotation = 0) {
    const def = BUILDINGS[type];
    if (!def?.bridge) return null;
    const size = getBuildingSize(type, rotation);
    const horizontal = size.w > size.h;
    const length = Math.max(size.w, size.h);
    const tiles = Array.from({ length }, (_, offset) => ({
      x: originX + (horizontal ? offset : 0),
      y: originY + (horizontal ? 0 : offset)
    }));
    if (tiles.some(tile => !inWorld(tile.x, tile.y))) {
      return { valid: false, reason: "That bridge reaches beyond the 100 × 100 world." };
    }
    if (tiles.some(tile => target.occupancy?.[tileIndex(tile.x, tile.y)])) {
      return { valid: false, reason: "That bridge overlaps another building." };
    }
    const first = tiles[0];
    const last = tiles.at(-1);
    if (!isClearingForState(target, first.x, first.y) || !isClearingForState(target, last.x, last.y)) {
      return { valid: false, reason: "Both ends of the bridge must meet cleared land." };
    }
    const span = tiles.slice(1, -1);
    if (!span.every(tile => getWaterwayTypeForState(target, tile.x, tile.y) === def.bridge)) {
      const label = def.bridge === "river" ? "three river tiles" : "one creek tile";
      return { valid: false, reason: `Rotate and position this bridge so its middle crosses ${label}.` };
    }
    return { valid: true, reason: "" };
  }

  function touchesWaterwayForState(target, originX, originY, size) {
    for (let dy = 0; dy < size.h; dy++) {
      for (let dx = 0; dx < size.w; dx++) {
        const x = originX + dx;
        const y = originY + dy;
        if ([[0, -1], [1, 0], [0, 1], [-1, 0]].some(([offsetX, offsetY]) => getWaterwayTypeForState(target, x + offsetX, y + offsetY))) return true;
      }
    }
    return false;
  }

  function buildingsShareEdge(first, second) {
    const horizontalOverlap = first.x < second.x + second.w && first.x + first.w > second.x;
    const verticalOverlap = first.y < second.y + second.h && first.y + first.h > second.y;
    return (horizontalOverlap && (first.y + first.h === second.y || second.y + second.h === first.y))
      || (verticalOverlap && (first.x + first.w === second.x || second.x + second.w === first.x));
  }

  function touchesBuildingTypeForState(target, originX, originY, size, requiredType) {
    const candidate = { x: originX, y: originY, w: size.w, h: size.h };
    return (target.buildings || []).some(building => building.type === requiredType && buildingsShareEdge(candidate, building));
  }

  function getFarmBarnRemovalBlockers(farm, target = state) {
    if (!farm || farm.type !== "farm") return [];
    const farms = (target.buildings || []).filter(building => building.type === "farm" && building.id !== farm.id);
    return (target.buildings || []).filter(barn => barn.type === "barn" && buildingsShareEdge(farm, barn) && !farms.some(otherFarm => buildingsShareEdge(otherFarm, barn)));
  }

  function canOccupyOnState(target, type, originX, originY, rotation = 0) {
    const bridgeStatus = getBridgePlacementStatusForState(target, type, originX, originY, rotation);
    if (bridgeStatus) return bridgeStatus.valid;
    const size = getBuildingSize(type, rotation);
    for (let dy = 0; dy < size.h; dy++) {
      for (let dx = 0; dx < size.w; dx++) {
        const x = originX + dx;
        const y = originY + dy;
        if (!inWorld(x, y)) return false;
        if (!isClearingForState(target, x, y)) return false;
        if (target.occupancy[tileIndex(x, y)]) return false;
      }
    }
    const def = BUILDINGS[type];
    if (def?.waterIntake && !touchesWaterwayForState(target, originX, originY, size)) return false;
    return !def?.requiresAdjacentType || touchesBuildingTypeForState(target, originX, originY, size, def.requiresAdjacentType);
  }

  function addBuildingToState(target, type, originX, originY, builtDay, id, rotation = 0) {
    const normalRotation = normaliseRotation(rotation);
    const size = getBuildingSize(type, normalRotation);
    const building = { type, x: originX, y: originY, w: size.w, h: size.h, rotation: normalRotation, builtDay, id, staffingPriority: "normal" };
    if (type === "wood_farm") building.woodFarmPlots = Array(WOOD_FARM_PLOTS).fill(getWorldTime(target));
    target.buildings.push(building);
    for (let dy = 0; dy < size.h; dy++) {
      for (let dx = 0; dx < size.w; dx++) target.occupancy[tileIndex(originX + dx, originY + dy)] = id;
    }
    if (target === state) rosterDirty = true;
    return building;
  }

  function normaliseWoodFarmPlots(building, target) {
    if (building.type !== "wood_farm") return building;
    const now = getWorldTime(target);
    const fallbackPlantedAt = clamp(Number(building.builtDay) || now, 1, now);
    const source = Array.isArray(building.woodFarmPlots) ? building.woodFarmPlots.slice(0, WOOD_FARM_PLOTS) : [];
    while (source.length < WOOD_FARM_PLOTS) source.push(fallbackPlantedAt);
    building.woodFarmPlots = source.map(value => clamp(Number.isFinite(Number(value)) ? Number(value) : fallbackPlantedAt, 1, now));
    return building;
  }

  function findOpenPlacement(target, type, preferredX, preferredY, maxRadius = 24, rotation = 0) {
    for (let radius = 0; radius <= maxRadius; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (radius && Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const x = preferredX + dx;
          const y = preferredY + dy;
          if (canOccupyOnState(target, type, x, y, rotation)) return { x, y };
        }
      }
    }
    return null;
  }

  function tutorialPlacementIsClean(target, type, x, y, rotation = 0) {
    const size = getBuildingSize(type, rotation);
    const candidate = { type, x, y, w: size.w, h: size.h };
    const def = BUILDINGS[type];
    const buildings = target.buildings || [];

    // Never recommend a footprint inside an existing fume or sound-pollution zone.
    if (buildings.some(building => (BUILDINGS[building.type]?.pollution > 0 && buildingGap(candidate, building) <= CROP_POLLUTION_RANGE)
      || (BUILDINGS[building.type]?.noise > 0 && buildingGap(candidate, building) <= getNoisePollutionRange(building)))) return false;

    // A recommended polluter must also keep its own pollution away from crops
    // and homes, so the guided layout remains safe as it grows.
    if (def.pollution > 0 && buildings.some(building => ["farm", "orchard"].includes(building.type)
      && buildingGap(candidate, building) <= CROP_POLLUTION_RANGE)) return false;
    if (def.noise > 0 && buildings.some(building => BUILDINGS[building.type]?.housing
      && buildingGap(candidate, building) <= getNoisePollutionRange(candidate))) return false;
    return true;
  }

  function findTidyTutorialPlacement(target, type, preferredX, preferredY, maxRadius = 24, rotation = 0) {
    const size = getBuildingSize(type, rotation);
    const candidates = [];
    for (let radius = 0; radius <= maxRadius; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (radius && Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const x = preferredX + dx;
          const y = preferredY + dy;
          if (!canOccupyOnState(target, type, x, y, rotation) || !tutorialPlacementIsClean(target, type, x, y, rotation)) continue;
          const candidate = { type, x, y, w: size.w, h: size.h };
          const nearbyTown = (target.buildings || []).filter(building => !BUILDINGS[building.type]?.pollution && !BUILDINGS[building.type]?.noise);
          const nearestGap = nearbyTown.length
            ? Math.min(...nearbyTown.map(building => buildingGap(candidate, building)))
            : 2;
          const preferredDistance = Math.abs(dx) + Math.abs(dy);
          // Keep homes, services and green spaces compact without squeezing
          // them on top of one another. Industry is already placed at safe edges.
          const neatness = BUILDINGS[type].category === "industry" ? 0 : Math.abs(nearestGap - 1.5) * 1.5;
          candidates.push({ x, y, score: preferredDistance + neatness });
        }
      }
    }
    candidates.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
    return candidates[0] || null;
  }

  function getBuildingAtForState(target, x, y) {
    if (!inWorld(x, y)) return null;
    const id = target?.occupancy?.[tileIndex(x, y)];
    return id ? target.buildings.find(building => building.id === id) || null : null;
  }

  function getBuildingAt(x, y) {
    return getBuildingAtForState(state, x, y);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function seededNoise(x, y, seed = 1) {
    let n = Math.imul(x + 31, 374761393) + Math.imul(y + 17, 668265263) + Math.imul(seed, 69069);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  function rand() {
    state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
    return state.rng / 4294967296;
  }

  function getDifficulty() {
    return DIFFICULTIES[state?.difficulty] || DIFFICULTIES.balanced;
  }

  function getSeason(day = state.day) {
    return SEASONS[Math.floor((day - 1) / SEASON_LENGTH) % SEASONS.length];
  }

  function getStaffedShiftEndHour(target = state) {
    const season = getSeason(Math.floor(Number(target?.day) || 1));
    if (season.id === "summer") return STAFFED_SHIFT_STANDARD_END_HOUR + 2;
    if (season.id === "winter") return STAFFED_SHIFT_STANDARD_END_HOUR - 1;
    return STAFFED_SHIFT_STANDARD_END_HOUR;
  }

  function getStaffedShiftDayFraction(target = state) {
    return (getStaffedShiftEndHour(target) - STAFFED_SHIFT_START_HOUR) / 24;
  }

  function formatVillageTime(hour) {
    const wholeHours = Math.floor(hour);
    const minutes = Math.round((hour - wholeHours) * 60);
    return `${String(wholeHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function getStaffedShiftLabel(target = state) {
    return `${formatVillageTime(STAFFED_SHIFT_START_HOUR)}–${formatVillageTime(getStaffedShiftEndHour(target))}`;
  }

  function areWaterwaysFrozen(target = state) {
    return getSeason(Number(target?.day) || 1).id === "winter";
  }

  function getWorldTime(target = state) {
    return (Number(target?.day) || 1) + (Number(target?.dayProgress) || 0);
  }

  function isFoodEatingTime(target = state) {
    const hour = getVillageHour(target);
    return hour >= FOOD_EATING_START_HOUR && hour < FOOD_EATING_END_HOUR;
  }

  function getResidentDailyFoodNeed(person, target = state) {
    const range = FOOD_NEED_RANGES[person?.ageGroup] || FOOD_NEED_RANGES.adult;
    const identity = Number(person?.id) || 0;
    return range[0] + (range[1] - range[0]) * seededNoise(identity, 211, Number(target?.terrainSeed) || 1);
  }

  function getDailyFoodNeed(target = state) {
    return (target?.people || []).reduce((total, person) => total + getResidentDailyFoodNeed(person, target), 0);
  }

  function getFoodConservationFactor(staffedProductionActive = !isVillagerNight()) {
    return Math.max(0.72, 1 - getOperationalBuildingUnits("granary", state, staffedProductionActive) * 0.055);
  }

  function getAverageDailyFoodConsumption() {
    const staffedEatingHours = Math.max(0, Math.min(FOOD_EATING_END_HOUR, getStaffedShiftEndHour()) - Math.max(FOOD_EATING_START_HOUR, STAFFED_SHIFT_START_HOUR));
    const eatingHours = FOOD_EATING_END_HOUR - FOOD_EATING_START_HOUR;
    const unstaffedEatingHours = eatingHours - staffedEatingHours;
    const difficulty = getDifficulty();
    return getDailyFoodNeed() * difficulty.consumption * (
      getFoodConservationFactor(true) * staffedEatingHours + getFoodConservationFactor(false) * unstaffedEatingHours
    ) / eatingHours;
  }

  function getYearDay(target = state) {
    const yearLength = SEASON_LENGTH * SEASONS.length;
    const worldDay = (Number(target?.day) || 1) - 1 + (Number(target?.dayProgress) || 0);
    return ((worldDay % yearLength) + yearLength) % yearLength;
  }

  function getAutumnColourProgress(target = state) {
    const yearDay = getYearDay(target);
    const transitionStart = SEASON_LENGTH * 2 - 3;
    const transitionEnd = SEASON_LENGTH * 2 + 2;
    if (yearDay < transitionStart || yearDay >= SEASON_LENGTH * 3) return 0;
    return clamp((yearDay - transitionStart) / (transitionEnd - transitionStart), 0, 1);
  }

  function getDeciduousCanopyProgress(target = state) {
    const yearDay = getYearDay(target);
    const winterStart = SEASON_LENGTH * 3;
    const autumnFadeStart = winterStart - SEASONAL_LEAF_FADE_DAYS;
    if (yearDay < SEASONAL_LEAF_FADE_DAYS) return clamp(yearDay / SEASONAL_LEAF_FADE_DAYS, 0, 1);
    if (yearDay >= autumnFadeStart && yearDay < winterStart) {
      return clamp((winterStart - yearDay) / SEASONAL_LEAF_FADE_DAYS, 0, 1);
    }
    if (yearDay >= winterStart) return 0;
    return 1;
  }

  function isEvergreenTree(x, y, seed = state?.terrainSeed || 1) {
    return seededNoise(Math.round(x), Math.round(y), Number(seed) ^ 0x6d2b79f5) < EVERGREEN_TREE_SHARE;
  }

  function weatherDurationFromRoll(weatherId, roll = 0.5) {
    const profile = WEATHERS[weatherId]?.duration || { minDays: 0.5, maxDays: 1.5, typicalDays: 1 };
    return profile.minDays + (profile.maxDays - profile.minDays) * clamp(Number(roll) || 0, 0, 1);
  }

  function getWeatherFadeDuration(weatherId = state.weather, durationDays = state.weatherDurationDays) {
    const duration = Number(durationDays) || WEATHERS[weatherId]?.duration?.typicalDays || 1;
    return Math.min(WEATHER_FADE_DAYS, Math.max(1 / 96, duration * 0.25));
  }

  function formatWeatherDuration(days) {
    const totalMinutes = Math.max(0, Math.round(Number(days || 0) * 24 * 60));
    if (totalMinutes <= 0) return "changing now";
    if (totalMinutes < 24 * 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (!hours) return `${minutes}m left`;
      return minutes ? `${hours}h ${minutes}m left` : `${hours}h left`;
    }
    const wholeDays = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    return hours ? `${wholeDays}d ${hours}h left` : `${wholeDays}d left`;
  }

  function getWeather() {
    const to = WEATHERS[state.weather] || WEATHERS.mild;
    const from = WEATHERS[state.weatherFrom] || to;
    const blend = clamp(Number.isFinite(Number(state.weatherBlend)) ? Number(state.weatherBlend) : 1, 0, 1);
    if (blend >= 0.999 || from.id === to.id) return to;
    const mix = (key, fallback = 1) => (from[key] ?? fallback) + ((to[key] ?? fallback) - (from[key] ?? fallback)) * blend;
    const eco = {};
    const metrics = new Set([...Object.keys(from.eco || {}), ...Object.keys(to.eco || {})]);
    for (const metric of metrics) eco[metric] = (from.eco?.[metric] || 0) + ((to.eco?.[metric] || 0) - (from.eco?.[metric] || 0)) * blend;
    return {
      ...to,
      id: blend < 0.5 ? from.id : to.id,
      name: `${from.name} → ${to.name}`,
      icon: blend < 0.5 ? from.icon : to.icon,
      food: mix("food"),
      waterOutput: mix("waterOutput"),
      wood: mix("wood"),
      waterUse: mix("waterUse"),
      eco,
      severe: Boolean((blend < 0.5 ? from : to).severe)
    };
  }

  function ecosystemScore(metrics = state.ecosystem) {
    const values = Object.values(metrics);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function getEcosystemCollapse(metrics = state.ecosystem) {
    const failedIndicator = Object.entries(metrics).find(([, value]) => Number(value) <= 0);
    if (failedIndicator) return { type: "indicator", metric: failedIndicator[0], score: ecosystemScore(metrics) };
    const score = ecosystemScore(metrics);
    return score < ECOSYSTEM_COLLAPSE_THRESHOLD ? { type: "overall", metric: null, score } : null;
  }

  function isPerfectEcosystem(metrics = state.ecosystem) {
    return ecosystemScore(metrics) >= PERFECT_ECOSYSTEM_DISPLAY_THRESHOLD;
  }

  function qualifiesForPerfectBalance(difficulty = state.difficulty, metrics = state.ecosystem) {
    return difficulty === "harsh" && isPerfectEcosystem(metrics);
  }

  function createNewState(name, difficulty) {
    const config = DIFFICULTIES[difficulty] || DIFFICULTIES.balanced;
    const resource = config.resourceMultiplier;
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const ecoOffset = config.startingEco;
    const ecosystem = {
      forest: clamp(92 + ecoOffset, 0, 100),
      wildlife: clamp(87 + ecoOffset, 0, 100),
      water: clamp(91 + ecoOffset, 0, 100),
      soil: clamp(89 + ecoOffset, 0, 100),
      air: clamp(96 + ecoOffset, 0, 100),
      biodiversity: clamp(90 + ecoOffset, 0, 100)
    };
    const initialEco = ecosystemScore(ecosystem);
    const initialWeatherDuration = weatherDurationFromRoll("mild", seededNoise(7, 19, seed));

    const nextState = {
      version: SAVE_VERSION,
      villageName: name || "Mossbank Clearing",
      difficulty,
      day: 1,
      dayProgress: 0,
      speed: 1,
      paused: true,
      weather: "mild",
      weatherFrom: "mild",
      weatherBlend: 1,
      weatherStartedAt: 1,
      weatherDurationDays: initialWeatherDuration,
      nextWeatherChange: 1 + initialWeatherDuration,
      population: 10,
      demographics: { children: 0, adults: 10, elders: 0 },
      education: 28,
      health: 92,
      happiness: 82,
      resources: {
        food: 120 * resource,
        water: 130 * resource,
        wood: 95 * resource,
        stone: 60 * resource
      },
      coins: 0,
      cityTrades: [],
      nextCityTradeId: 1,
      cityMarketEvent: null,
      nextCityMarketEventAt: null,
      ecosystem,
      terrainSeed: seed ^ 0x6d2b79f5,
      buildings: [],
      people: [],
      nextPersonId: 1,
      pendingTravellerResidents: 0,
      // Population is represented by individual records, so retain fractional
      // births and hardship losses here until they become a whole resident.
      populationChangeProgress: 0,
      loggedTrees: {},
      priorityTrees: {},
      priorityStumps: {},
      remoteStumps: {},
      clearedTiles: {},
      waterways: {},
      waterwaysInitialised: false,
      burnedTrees: {},
      burnedTreeMapInitialised: false,
      occupancy: Array(WORLD_SIZE * WORLD_SIZE).fill(0),
      camera: { x: WORLD_CENTER, y: WORLD_CENTER, zoom: 0.85 },
      descriptionsEnabled: true,
      placementTutorialCompleted: false,
      rng: seed,
      nextBuildingId: 2,
      nextEventDay: 4,
      lastEventId: null,
      scenarioId: null,
      scenarioCompleted: false,
      objectiveChapter: 0,
      completedObjectives: [],
      buffs: {},
      learning: {
        completedLessons: [],
        quizAnswered: [],
        quizAttempts: 0,
        guideViews: 0
      },
      logs: [
        { day: 1, text: "The founders lit the central hearth in a quiet forest clearing.", important: true }
      ],
      stats: {
        buildingsBuilt: 0,
        animalsHunted: 0,
        minEco: initialEco,
        maxPopulation: 10,
        dippedBelow40: false,
        stewardComplete: false,
        lastDayEco: initialEco,
        ecoDailyChange: 0,
        eventsFaced: 0,
        treesLogged: 0,
        priorityTreesFelled: 0,
        priorityStumpsRemoved: 0,
        treesPrioritized: 0,
        treesUnprioritized: 0,
        stumpsRemoved: 0,
        fireScarTilesCleared: 0,
        woodFarmTreesHarvested: 0,
        treeTimberYielded: 0,
        treeTimberStored: 0,
        lastTreeTimberYield: 0,
        naturalDeaths: 0,
        travellerDeaths: 0,
        travellingSettlersWelcomed: 0
      },
      gameOver: null,
      createdAt: new Date().toISOString()
    };
    nextState.nextEventDay = getWorldTime(nextState) + eventGapFromRoll(seededNoise(17, 313, nextState.terrainSeed), difficulty, nextState.day);
    addBuildingToState(nextState, "hearth", 49, 49, 1, 1);
    initialiseWaterways(nextState);
    clampResourcesToStorage(nextState);
    normalisePeopleForState(nextState);
    return nextState;
  }

  function createScenarioState(scenarioId) {
    const scenario = SCENARIOS.find(item => item.id === scenarioId);
    if (!scenario) return createNewState("Mossbank Clearing", "balanced");
    const nextState = createNewState(scenario.villageName, scenario.difficulty);
    nextState.day = scenario.day;
    nextState.dayProgress = scenario.dayProgress;
    nextState.weather = scenario.weather;
    nextState.weatherFrom = scenario.weather;
    nextState.weatherBlend = 1;
    nextState.terrainSeed = scenario.seed;
    nextState.waterways = {};
    nextState.waterwaysInitialised = false;
    nextState.scenarioId = scenario.id;
    nextState.dryRiverRefilled = false;
    nextState.dryRiverStormStartedAt = null;
    nextState.dryRiverGushStartedAt = null;
    nextState.rng = scenario.seed ^ 0xa53c9e17;
    nextState.weatherStartedAt = getWorldTime(nextState);
    nextState.weatherDurationDays = weatherDurationFromRoll(scenario.weather, seededNoise(11, 37, scenario.seed));
    nextState.nextWeatherChange = nextState.weatherStartedAt + nextState.weatherDurationDays;
    nextState.population = scenario.population;
    nextState.demographics = { ...scenario.demographics };
    nextState.education = scenario.education;
    nextState.health = scenario.health;
    nextState.happiness = scenario.happiness;
    nextState.resources = { ...scenario.resources };
    nextState.ecosystem = { ...scenario.ecosystem };
    nextState.buildings = [];
    nextState.occupancy = Array(WORLD_SIZE * WORLD_SIZE).fill(0);
    nextState.nextBuildingId = 1;
    let skipped = 0;
    for (const [type, preferredX, preferredY, rotation = 0] of scenario.buildings) {
      const spot = findOpenPlacement(nextState, type, preferredX, preferredY, 26, rotation);
      if (!spot) {
        skipped += 1;
        continue;
      }
      addBuildingToState(nextState, type, spot.x, spot.y, scenario.day - 2, nextState.nextBuildingId++, rotation);
    }
    nextState.people = [];
    nextState.nextPersonId = 1;
    nextState.loggedTrees = {};
    nextState.priorityTrees = {};
    nextState.priorityStumps = {};
    nextState.remoteStumps = {};
    nextState.clearedTiles = {};
    normaliseDemographics(nextState);
    normalisePeopleForState(nextState);
    if (scenario.loggedTreeCount) {
      const candidates = nextState.buildings
        .filter(building => building.type === "lumber")
        .flatMap(building => getLoggingTreesInRange(building, nextState))
        .filter((tree, index, all) => all.findIndex(other => other.x === tree.x && other.y === tree.y) === index);
      for (const tree of candidates.slice(0, scenario.loggedTreeCount)) nextState.loggedTrees[tileIndex(tree.x, tree.y)] = scenario.day - 1;
    }
    const startingEco = ecosystemScore(nextState.ecosystem);
    nextState.stats = {
      ...nextState.stats,
      buildingsBuilt: 0,
      minEco: startingEco,
      maxPopulation: scenario.population,
      lastDayEco: startingEco,
      ecoDailyChange: 0,
      treesLogged: Object.keys(nextState.loggedTrees).length
    };
    nextState.nextEventDay = getWorldTime(nextState) + eventGapFromRoll(seededNoise(scenario.day, 313, scenario.seed), scenario.difficulty, scenario.day);
    nextState.lastEventId = null;
    initialiseWaterways(nextState);
    initialiseAfterFireBurnedTrees(nextState);
    nextState.scenarioCompleted = false;
    nextState.objectiveChapter = 0;
    nextState.completedObjectives = [];
    nextState.buffs = {};
    nextState.logs = [
      { day: scenario.day, text: `You took charge of ${scenario.villageName}: ${scenario.name}.`, important: true },
      { day: scenario.day - 1, text: scenario.brief, important: true }
    ];
    if (skipped) nextState.logs.unshift({ day: scenario.day, text: `${skipped} planned building${skipped === 1 ? "" : "s"} could not fit inside the clearing.`, important: true });
    clampResourcesToStorage(nextState);
    nextState.paused = true;
    nextState.gameOver = null;
    return nextState;
  }

  function normaliseObjectiveProgress(target) {
    const finalChapter = OBJECTIVE_CHAPTERS.length - 1;
    target.completedObjectives = Array.isArray(target.completedObjectives)
      ? [...new Set(target.completedObjectives.map(Number).filter(index => Number.isInteger(index) && index >= 0 && index <= finalChapter))]
      : [];
    let chapter = clamp(Math.floor(Number(target.objectiveChapter) || 0), 0, finalChapter);
    while (chapter < finalChapter && target.completedObjectives.includes(chapter)) chapter += 1;
    target.objectiveChapter = chapter;
    return chapter;
  }

  function normaliseLoadedState(loaded) {
    const fallback = createNewState(loaded?.villageName, loaded?.difficulty || "balanced");
    if (!loaded) return fallback;
    if (loaded.version === 1 && Array.isArray(loaded.tiles)) return migrateLegacyState(loaded);
    if (loaded.version !== SAVE_VERSION || !Array.isArray(loaded.buildings)) return fallback;
    const merged = { ...fallback, ...loaded };
    merged.resources = { ...fallback.resources, ...(loaded.resources || {}) };
    merged.coins = Math.max(0, Math.floor(Number(loaded.coins) || 0));
    merged.cityTrades = Array.isArray(loaded.cityTrades)
      ? loaded.cityTrades.filter(trade => {
        const resource = String(trade?.resource || "");
        return ["buy", "sell"].includes(trade?.direction)
          && Object.prototype.hasOwnProperty.call(CITY_RESOURCE_LABELS, resource)
          && Number.isFinite(Number(trade?.amount))
          && Number.isFinite(Number(trade?.coins))
          && Number.isFinite(Number(trade?.dueAt));
      }).map(trade => ({
        id: Math.max(1, Math.floor(Number(trade.id) || 1)),
        direction: trade.direction,
        resource: trade.resource,
        amount: Math.max(1, Math.floor(Number(trade.amount))),
        coins: Math.max(0, Math.floor(Number(trade.coins))),
        dueAt: Number(trade.dueAt),
        sentAt: Number.isFinite(Number(trade.sentAt)) ? Number(trade.sentAt) : Number(trade.dueAt) - CITY_TRADE_DURATION_DAYS
      })) : [];
    merged.nextCityTradeId = Math.max(1, Math.floor(Number(loaded.nextCityTradeId) || 1), ...merged.cityTrades.map(trade => trade.id + 1));
    const savedMarketEvent = loaded.cityMarketEvent;
    merged.cityMarketEvent = CITY_MARKET_EVENTS.some(event => event.id === savedMarketEvent?.id) && Number(savedMarketEvent?.until) > getWorldTime(merged)
      ? { id: savedMarketEvent.id, startedAt: Number(savedMarketEvent.startedAt) || getWorldTime(merged), until: Number(savedMarketEvent.until) }
      : null;
    merged.nextCityMarketEventAt = Number.isFinite(Number(loaded.nextCityMarketEventAt))
      ? Number(loaded.nextCityMarketEventAt)
      : null;
    merged.ecosystem = { ...fallback.ecosystem, ...(loaded.ecosystem || {}) };
    merged.stats = { ...fallback.stats, ...(loaded.stats || {}) };
    merged.buffs = { ...(loaded.buffs || {}) };
    merged.learning = { ...fallback.learning, ...(loaded.learning || {}) };
    merged.learning.completedLessons = Array.isArray(loaded.learning?.completedLessons)
      ? [...new Set(loaded.learning.completedLessons.filter(id => ENVIRONMENT_LESSONS.some(lesson => lesson.id === id)))]
      : [];
    merged.learning.quizAnswered = Array.isArray(loaded.learning?.quizAnswered)
      ? [...new Set(loaded.learning.quizAnswered.filter(id => KNOWLEDGE_QUESTIONS.some(question => question.id === id)))]
      : [];
    merged.learning.quizAttempts = Math.max(0, Math.floor(Number(loaded.learning?.quizAttempts) || 0));
    merged.learning.guideViews = Math.max(0, Math.floor(Number(loaded.learning?.guideViews) || 0));
    merged.logs = Array.isArray(loaded.logs) ? loaded.logs.slice(0, 100) : fallback.logs;
    merged.people = Array.isArray(loaded.people) ? loaded.people : [];
    merged.nextPersonId = Number.isFinite(Number(loaded.nextPersonId)) ? Number(loaded.nextPersonId) : 1;
    merged.loggedTrees = loaded.loggedTrees && typeof loaded.loggedTrees === "object" ? { ...loaded.loggedTrees } : {};
    merged.priorityTrees = loaded.priorityTrees && typeof loaded.priorityTrees === "object" ? { ...loaded.priorityTrees } : {};
    merged.priorityStumps = loaded.priorityStumps && typeof loaded.priorityStumps === "object" ? { ...loaded.priorityStumps } : {};
    merged.remoteStumps = loaded.remoteStumps && typeof loaded.remoteStumps === "object" ? { ...loaded.remoteStumps } : {};
    merged.clearedTiles = loaded.clearedTiles && typeof loaded.clearedTiles === "object" ? { ...loaded.clearedTiles } : {};
    merged.waterways = loaded.waterways && typeof loaded.waterways === "object" ? { ...loaded.waterways } : {};
    merged.waterwaysInitialised = loaded.waterwaysInitialised === true;
    merged.burnedTrees = loaded.burnedTrees && typeof loaded.burnedTrees === "object" ? { ...loaded.burnedTrees } : {};
    merged.burnedTreeMapInitialised = loaded.burnedTreeMapInitialised === true;
    merged.buildings = loaded.buildings
      .filter(building => BUILDINGS[building.type] && Number.isFinite(building.x) && Number.isFinite(building.y))
      .map(building => {
        const rotation = normaliseRotation(building.rotation);
        return normaliseWoodFarmPlots({ ...building, staffingPriority: normaliseWorkPriority(building.staffingPriority), rotation, ...getBuildingSize(building.type, rotation) }, merged);
      });
    merged.camera = { ...fallback.camera, ...(loaded.camera || {}) };
    merged.descriptionsEnabled = loaded.descriptionsEnabled !== false;
    merged.weather = WEATHERS[loaded.weather] ? loaded.weather : fallback.weather;
    merged.weatherFrom = WEATHERS[loaded.weatherFrom] ? loaded.weatherFrom : merged.weather;
    merged.weatherBlend = clamp(Number.isFinite(Number(loaded.weatherBlend)) ? Number(loaded.weatherBlend) : 1, 0, 1);
    merged.nextWeatherChange = Number.isFinite(Number(loaded.nextWeatherChange))
      ? Number(loaded.nextWeatherChange)
      : getWorldTime(merged) + weatherDurationFromRoll(merged.weather, seededNoise(merged.day, 37, merged.terrainSeed));
    merged.weatherDurationDays = Number.isFinite(Number(loaded.weatherDurationDays))
      ? Math.max(1 / 96, Number(loaded.weatherDurationDays))
      : Math.max(1 / 96, merged.nextWeatherChange - getWorldTime(merged));
    merged.weatherStartedAt = Number.isFinite(Number(loaded.weatherStartedAt))
      ? Number(loaded.weatherStartedAt)
      : merged.nextWeatherChange - merged.weatherDurationDays;
    merged.nextEventDay = Number.isFinite(Number(loaded.nextEventDay))
      ? Number(loaded.nextEventDay)
      : getWorldTime(merged) + eventGapFromRoll(seededNoise(merged.day, 313, merged.terrainSeed), merged.difficulty, merged.day);
    merged.pendingTravellerResidents = Math.max(0, Math.floor(Number(loaded.pendingTravellerResidents) || 0));
    merged.populationChangeProgress = clamp(
      Number.isFinite(Number(loaded.populationChangeProgress)) ? Number(loaded.populationChangeProgress) : 0,
      -0.999999,
      0.999999
    );
    merged.scenarioId = SCENARIOS.some(scenario => scenario.id === loaded.scenarioId) ? loaded.scenarioId : null;
    merged.placementTutorialCompleted = loaded.placementTutorialCompleted === true;
    initialiseWaterways(merged);
    initialiseAfterFireBurnedTrees(merged);
    merged.scenarioCompleted = Boolean(loaded.scenarioCompleted);
    normaliseObjectiveProgress(merged);
    normaliseDemographics(merged);
    normalisePeopleForState(merged);
    rebuildOccupancy(merged);
    clampResourcesToStorage(merged);
    merged.paused = true;
    return merged;
  }

  function migrateLegacyState(loaded) {
    const migrated = createNewState(loaded.villageName, loaded.difficulty || "balanced");
    for (const key of ["day", "dayProgress", "speed", "weather", "population", "demographics", "education", "health", "happiness", "rng", "nextEventDay", "lastEventId", "objectiveChapter", "completedObjectives", "buffs", "logs", "stats", "gameOver", "createdAt"]) {
      if (loaded[key] !== undefined) migrated[key] = loaded[key];
    }
    migrated.resources = { ...migrated.resources, ...(loaded.resources || {}) };
    migrated.ecosystem = { ...migrated.ecosystem, ...(loaded.ecosystem || {}) };
    migrated.buildings = migrated.buildings.filter(building => building.type === "hearth");
    migrated.waterways = {};
    migrated.waterwaysInitialised = false;
    rebuildOccupancy(migrated);
    let migratedCount = 0;
    let skippedCount = 0;
    for (let index = 0; index < loaded.tiles.length; index++) {
      const legacy = loaded.tiles[index];
      if (!legacy || legacy.type === "hearth" || !BUILDINGS[legacy.type]) continue;
      const oldX = index % 30;
      const oldY = Math.floor(index / 30);
      const size = getBuildingSize(legacy.type);
      const preferredX = Math.round(WORLD_CENTER + oldX - 15 - size.w / 2);
      const preferredY = Math.round(WORLD_CENTER + oldY - 15 - size.h / 2);
      const spot = findOpenPlacement(migrated, legacy.type, preferredX, preferredY);
      if (spot) {
        addBuildingToState(migrated, legacy.type, spot.x, spot.y, legacy.builtDay || migrated.day, migrated.nextBuildingId++);
        migratedCount++;
      } else {
        skippedCount++;
      }
    }
    migrated.logs = Array.isArray(migrated.logs) ? migrated.logs : [];
    migrated.logs.unshift({ day: migrated.day, text: `The settlement map expanded to 100 × 100. ${migratedCount} buildings were relocated${skippedCount ? `; ${skippedCount} could not fit the new clearing` : ""}.`, important: true });
    migrated.weather = WEATHERS[migrated.weather] ? migrated.weather : "mild";
    migrated.weatherFrom = migrated.weather;
    migrated.weatherBlend = 1;
    migrated.weatherStartedAt = getWorldTime(migrated);
    migrated.weatherDurationDays = weatherDurationFromRoll(migrated.weather, seededNoise(migrated.day, 41, migrated.terrainSeed));
    migrated.nextWeatherChange = migrated.weatherStartedAt + migrated.weatherDurationDays;
    migrated.scenarioId = null;
    migrated.scenarioCompleted = false;
    normaliseDemographics(migrated);
    migrated.people = [];
    migrated.loggedTrees = {};
    migrated.priorityTrees = {};
    migrated.priorityStumps = {};
    migrated.remoteStumps = {};
    migrated.clearedTiles = {};
    migrated.waterways = {};
    migrated.waterwaysInitialised = false;
    migrated.burnedTrees = {};
    migrated.burnedTreeMapInitialised = true;
    initialiseWaterways(migrated);
    normalisePeopleForState(migrated);
    clampResourcesToStorage(migrated);
    migrated.paused = true;
    return migrated;
  }

  function countBuilding(type) {
    if (!state?.buildings) return 0;
    return state.buildings.filter(building => building.type === type).length;
  }

  function getWorkerCapacity(definition) {
    const def = typeof definition === "string" ? BUILDINGS[definition] : definition;
    return Math.max(0, Math.floor(Number(def?.workerCapacity ?? def?.jobs) || 0));
  }

  function formatProductionMultiplier(value) {
    return Number(value).toFixed(2).replace(/\.?0+$/, "") || "0";
  }

  function getBuildingProductionMultiplier(building, target = state, staffedProductionActive = !isVillagerNight(target), skillBoost = 1) {
    const def = BUILDINGS[building?.type];
    if (!def) return 0;
    const capacity = getWorkerCapacity(def);
    const assigned = Math.min(capacity, getAssignedWorkersForState(building.id, target));

    if (def.automaticProduction !== undefined) {
      const baseline = Math.max(0, Number(def.automaticProduction) || 0);
      if (!staffedProductionActive || !capacity) return baseline;
      const full = Math.max(baseline, Number(def.fullStaffProduction) || baseline);
      return baseline + (full - baseline) * assigned / capacity;
    }

    if (!def.jobs) return 1;
    if (!staffedProductionActive || !capacity) return 0;
    const standardStaff = clamp(Math.floor(Number(def.standardStaff) || capacity), 1, capacity);
    const full = Math.max(1, Number(def.fullStaffProduction) || 1);
    const staffingMultiplier = assigned <= standardStaff
      ? assigned / standardStaff
      : 1 + (full - 1) * (assigned - standardStaff) / Math.max(1, capacity - standardStaff);
    return staffingMultiplier * skillBoost;
  }

  function getBuildingOperationFactor(building, target = state, staffedProductionActive = !isVillagerNight(target)) {
    const def = BUILDINGS[building?.type];
    if (!def) return 0;
    if (!def.jobs) return 1;
    if (!staffedProductionActive) return 0;
    const assigned = getAssignedWorkersForState(building.id, target);
    return Math.min(1, assigned / def.jobs);
  }

  function getOperationalBuildingUnits(type, target = state, staffedProductionActive = !isVillagerNight(target)) {
    return (target.buildings || [])
      .filter(building => building.type === type)
      .reduce((total, building) => total + getBuildingOperationFactor(building, target, staffedProductionActive), 0);
  }

  function getHousing() {
    let housing = 0;
    for (const building of state.buildings) {
      housing += BUILDINGS[building.type]?.housing || 0;
    }
    return housing;
  }

  function getStorageCapacity(resource, target = state) {
    if (!target?.buildings) return 0;
    return target.buildings.reduce((total, building) => {
      const def = BUILDINGS[building.type];
      return total + (def?.storage || 0) + (def?.storageByResource?.[resource] || 0);
    }, 0);
  }

  function storeResource(resource, amount, target = state) {
    if (!target?.resources || !["food", "water", "wood", "stone"].includes(resource)) return 0;
    const before = Math.max(0, Number(target.resources[resource]) || 0);
    const capacity = getStorageCapacity(resource, target);
    const after = clamp(before + amount, 0, capacity);
    target.resources[resource] = after;
    return after - before;
  }

  function isCityMarketUnlocked(target = state) {
    return Boolean(target?.buildings?.some(building => building.type === "market"));
  }

  function getActiveCityMarketEvent(target = state) {
    const condition = target?.cityMarketEvent;
    if (!condition || Number(condition.until) <= getWorldTime(target)) return null;
    return CITY_MARKET_EVENTS.find(event => event.id === condition.id) || null;
  }

  function getCityMarketPrice(resource, seasonId = getSeason().id, target = state) {
    const seasonalPrice = Number(CITY_MARKET_PRICES[resource]?.[seasonId]) || 1;
    const marketEvent = getActiveCityMarketEvent(target);
    return seasonalPrice * (Number(marketEvent?.modifiers?.[resource]) || 1);
  }

  function getCityTradeCoinAmount(direction, resource, amount) {
    const base = getCityMarketPrice(resource);
    return direction === "buy"
      ? Math.max(1, Math.ceil(amount * base * 1.35))
      : Math.max(1, Math.round(amount * base));
  }

  function scheduleNextCityMarketEvent(fromTime = getWorldTime()) {
    state.nextCityMarketEventAt = fromTime + CITY_MARKET_EVENT_MIN_GAP_DAYS + rand() * (CITY_MARKET_EVENT_MAX_GAP_DAYS - CITY_MARKET_EVENT_MIN_GAP_DAYS);
  }

  function updateCityMarketConditions() {
    if (!isCityMarketUnlocked()) {
      state.cityMarketEvent = null;
      state.nextCityMarketEventAt = null;
      return;
    }
    const now = getWorldTime();
    const activeEvent = getActiveCityMarketEvent();
    if (activeEvent) return;
    if (state.cityMarketEvent) {
      const expired = CITY_MARKET_EVENTS.find(event => event.id === state.cityMarketEvent.id);
      if (expired) addLog(`City market normalised after ${expired.title.toLowerCase()}.`);
      state.cityMarketEvent = null;
    }
    if (!Number.isFinite(Number(state.nextCityMarketEventAt))) {
      scheduleNextCityMarketEvent(now);
      return;
    }
    if (now + 0.000001 < state.nextCityMarketEventAt) return;
    const marketEvent = CITY_MARKET_EVENTS[Math.floor(rand() * CITY_MARKET_EVENTS.length)];
    const duration = marketEvent.duration[0] + rand() * (marketEvent.duration[1] - marketEvent.duration[0]);
    state.cityMarketEvent = { id: marketEvent.id, startedAt: now, until: now + duration };
    scheduleNextCityMarketEvent(now + duration);
    const affectedResources = Object.keys(marketEvent.modifiers).map(resource => CITY_RESOURCE_LABELS[resource].toLowerCase()).join(" and ");
    addLog(`City market special: ${marketEvent.title}. ${affectedResources} prices have changed for about ${formatWeatherDuration(duration).replace(" left", "")}.`, true);
    showToast("City market special", `${marketEvent.title} · ${affectedResources} prices have changed.`, marketEvent.icon);
  }

  function cityTradeDescription(trade) {
    const resourceName = CITY_RESOURCE_LABELS[trade.resource] || trade.resource;
    return trade.direction === "sell"
      ? `${trade.amount} ${resourceName} for ${trade.coins} coins`
      : `${trade.coins} coins for ${trade.amount} ${resourceName}`;
  }

  function dispatchCityTrade(direction, resource, amount = CITY_TRADE_AMOUNT) {
    const quantity = Math.max(1, Math.floor(Number(amount) || 0));
    if (!isCityMarketUnlocked()) {
      showToast("Market locked", "Build a Village Market before arranging city trade.", "◇");
      return false;
    }
    if (!["buy", "sell"].includes(direction) || !Object.prototype.hasOwnProperty.call(CITY_RESOURCE_LABELS, resource)) return false;
    const coins = getCityTradeCoinAmount(direction, resource, quantity);
    if (direction === "sell" && state.resources[resource] + 0.0001 < quantity) {
      showToast("Not enough goods", `The caravan needs ${quantity} ${CITY_RESOURCE_LABELS[resource].toLowerCase()}.`, "!");
      return false;
    }
    if (direction === "buy" && state.coins < coins) {
      showToast("Not enough coins", `This delivery costs ${coins} coins.`, "!");
      return false;
    }
    if (direction === "sell") storeResource(resource, -quantity);
    else state.coins -= coins;
    const trade = {
      id: Math.max(1, Math.floor(Number(state.nextCityTradeId) || 1)),
      direction,
      resource,
      amount: quantity,
      coins,
      sentAt: getWorldTime(),
      dueAt: getWorldTime() + CITY_TRADE_DURATION_DAYS
    };
    state.nextCityTradeId = trade.id + 1;
    state.cityTrades.push(trade);
    addLog(`City trade sent: ${cityTradeDescription(trade)}. The caravan returns in ${CITY_TRADE_DURATION_DAYS} days.`);
    showToast("Caravan dispatched", `${cityTradeDescription(trade)} · return in ${CITY_TRADE_DURATION_DAYS} in-game days.`, "◇");
    saveGame();
    return trade;
  }

  function processCityTrades() {
    if (!Array.isArray(state.cityTrades) || !state.cityTrades.length) return;
    const now = getWorldTime();
    const completed = state.cityTrades.filter(trade => Number(trade.dueAt) <= now + 0.000001);
    if (!completed.length) return;
    state.cityTrades = state.cityTrades.filter(trade => Number(trade.dueAt) > now + 0.000001);
    for (const trade of completed) {
      if (trade.direction === "sell") {
        state.coins += trade.coins;
        addLog(`City payment arrived: ${trade.coins} coins for ${trade.amount} ${CITY_RESOURCE_LABELS[trade.resource].toLowerCase()}.`, true);
        showToast("City payment received", `${trade.coins} coins were added to the treasury.`, "●");
      } else {
        const delivered = storeResource(trade.resource, trade.amount);
        const lost = trade.amount - delivered;
        const deliveryText = lost > 0.001
          ? `${Math.floor(delivered)} ${CITY_RESOURCE_LABELS[trade.resource].toLowerCase()} stored; ${Math.ceil(lost)} could not fit.`
          : `${trade.amount} ${CITY_RESOURCE_LABELS[trade.resource].toLowerCase()} stored.`;
        addLog(`City delivery arrived: ${deliveryText}`, true);
        showToast("City delivery arrived", deliveryText, "◇");
      }
    }
    saveGame();
  }

  function clampResourcesToStorage(target = state) {
    for (const resource of ["food", "water", "wood", "stone"]) storeResource(resource, 0, target);
  }

  function getJobs() {
    let jobs = 0;
    for (const building of state.buildings) {
      jobs += getWorkerCapacity(BUILDINGS[building.type]);
    }
    return jobs;
  }

  function normaliseDemographics(target = state) {
    const population = Math.max(0, Number(target.population) || 0);
    const source = target.demographics || {};
    let children = Math.max(0, Number(source.children) || 0);
    let adults = Math.max(0, Number(source.adults) || 0);
    let elders = Math.max(0, Number(source.elders) || 0);
    const groupTotal = children + adults + elders;

    if (groupTotal <= 0 && population > 0) {
      children = population * 0.22;
      elders = population * 0.1;
      adults = population - children - elders;
    } else if (groupTotal > 0 && Math.abs(groupTotal - population) > 0.001) {
      const scale = population / groupTotal;
      children *= scale;
      adults *= scale;
      elders *= scale;
    }

    target.demographics = { children, adults, elders };
    target.population = children + adults + elders;
    target.education = clamp(Number.isFinite(Number(target.education)) ? Number(target.education) : 28, 0, 100);
    return target.demographics;
  }

  function generatedPersonName(target, id, usedNames = new Set()) {
    const firstIndex = Math.floor(seededNoise(id, 29, target.terrainSeed) * FIRST_NAMES.length) % FIRST_NAMES.length;
    let surnameIndex = Math.floor(seededNoise(id, 83, target.terrainSeed ^ 0x7f4a7c15) * SURNAMES.length) % SURNAMES.length;
    let name = `${FIRST_NAMES[firstIndex]} ${SURNAMES[surnameIndex]}`;
    let attempts = 0;
    while (usedNames.has(name) && attempts < SURNAMES.length) {
      surnameIndex = (surnameIndex + 1) % SURNAMES.length;
      name = `${FIRST_NAMES[firstIndex]} ${SURNAMES[surnameIndex]}`;
      attempts += 1;
    }
    if (usedNames.has(name)) name = `${name} ${id}`;
    return name;
  }

  function travellerLifespanForPerson(target, id) {
    const range = TRAVELLER_LIFESPAN_MAX_DAYS - TRAVELLER_LIFESPAN_MIN_DAYS + 1;
    return TRAVELLER_LIFESPAN_MIN_DAYS + Math.floor(seededNoise(id, 211, target.terrainSeed) * range);
  }

  function residentDeathAgeForPerson(target, id) {
    const range = RESIDENT_LIFESPAN_MAX_DAYS - RESIDENT_LIFESPAN_MIN_DAYS + 1;
    return RESIDENT_LIFESPAN_MIN_DAYS + Math.floor(seededNoise(id, 197, target.terrainSeed) * range);
  }

  function elderAgeForPerson(target, id) {
    // Residents are children through age 6, then adults until their individual
    // elder threshold between ages 35 and 40.
    return 35 + Math.floor(seededNoise(id, 241, target.terrainSeed) * 6);
  }

  function ageGroupForPerson(person, atTime = getWorldTime()) {
    const age = Math.max(0, atTime - Number(person.birthAt));
    const elderAge = Number.isFinite(Number(person.elderAgeDays))
      ? clamp(Number(person.elderAgeDays), 35, 40)
      : 35;
    if (age < 7) return "child";
    if (age < elderAge) return "adult";
    return "elder";
  }

  function syncLifeStagesForState(target = state, atTime = getWorldTime(target)) {
    const people = Array.isArray(target.people) ? target.people : [];
    const demographics = { children: 0, adults: 0, elders: 0 };
    let stagesChanged = false;
    for (const person of people) {
      if (!Number.isFinite(Number(person.birthAt))) continue;
      person.elderAgeDays = Number.isFinite(Number(person.elderAgeDays))
        ? clamp(Number(person.elderAgeDays), 35, 40)
        : elderAgeForPerson(target, person.id);
      const ageGroup = ageGroupForPerson(person, atTime);
      stagesChanged ||= person.ageGroup !== ageGroup;
      person.ageGroup = ageGroup;
      if (ageGroup === "child") demographics.children += 1;
      else if (ageGroup === "elder") demographics.elders += 1;
      else demographics.adults += 1;
    }
    target.demographics = demographics;
    target.population = people.length;
    if (target === state && stagesChanged) rosterDirty = true;
  }

  function createPersonLifecycle(target, id, ageGroup, origin, joinedAt) {
    let deathAgeDays = residentDeathAgeForPerson(target, id);
    const elderAgeDays = elderAgeForPerson(target, id);
    const ageRoll = seededNoise(id, 223, target.terrainSeed);
    let ageAtArrival;

    if (origin === "traveller") {
      let remainingDays = travellerLifespanForPerson(target, id);
      if (ageGroup === "child") {
        deathAgeDays = RESIDENT_LIFESPAN_MIN_DAYS + Math.floor(seededNoise(id, 229, target.terrainSeed) * 8);
        remainingDays = clamp(remainingDays, deathAgeDays - 7, TRAVELLER_LIFESPAN_MAX_DAYS);
      } else if (ageGroup === "elder") {
        remainingDays = Math.min(25, remainingDays);
        deathAgeDays = Math.max(deathAgeDays, remainingDays + 35);
      } else {
        deathAgeDays = Math.max(deathAgeDays, remainingDays + 7);
      }
      ageAtArrival = deathAgeDays - remainingDays;
    } else if (ageGroup === "child") {
      ageAtArrival = origin === "village-born" ? 0 : ageRoll * 7;
    } else if (ageGroup === "elder") {
      ageAtArrival = elderAgeDays + ageRoll * Math.max(0.01, deathAgeDays - elderAgeDays);
    } else {
      ageAtArrival = origin === "village-born" ? 7 : 7 + ageRoll * Math.max(0.01, elderAgeDays - 7);
    }

    const birthAt = joinedAt - ageAtArrival;
    return {
      birthAt,
      deathAgeDays,
      elderAgeDays,
      lifeEndsAt: birthAt + deathAgeDays,
      settlementLifespanDays: birthAt + deathAgeDays - joinedAt
    };
  }

  function createPersonRecord(target, ageGroup, usedNames, origin = "village-born") {
    const id = Math.max(1, Math.floor(target.nextPersonId || 1));
    target.nextPersonId = id + 1;
    const name = generatedPersonName(target, id, usedNames);
    const joinedAt = getWorldTime(target);
    const lifecycle = createPersonLifecycle(target, id, ageGroup, origin, joinedAt);
    usedNames.add(name);
    return {
      id,
      name,
      ageGroup,
      origin,
      joinedDay: Math.max(1, Math.floor(joinedAt)),
      joinedAt,
      birthAt: lifecycle.birthAt,
      deathAgeDays: lifecycle.deathAgeDays,
      elderAgeDays: lifecycle.elderAgeDays,
      lifeEndsAt: lifecycle.lifeEndsAt,
      settlementLifespanDays: lifecycle.settlementLifespanDays,
      lifespanStartedAt: lifecycle.birthAt,
      lifespanDays: lifecycle.deathAgeDays,
      carryCapacity: 1 + Math.floor(seededNoise(id, 151, target.terrainSeed) * 3),
      carriedItem: "",
      carriedAmount: 0,
      workPriority: "normal",
      workBuildingId: null,
      schoolBuildingId: null,
      homeBuildingId: null,
      tripPhase: "work"
    };
  }

  function normalisePeopleForState(target = state) {
    const desired = Math.max(0, Math.floor(target.population || 0));
    const targetChildren = target.population > 0 ? Math.round(desired * target.demographics.children / target.population) : 0;
    let targetElders = target.population > 0 ? Math.round(desired * target.demographics.elders / target.population) : 0;
    if (targetChildren + targetElders > desired) targetElders = Math.max(0, desired - targetChildren);
    const targetAdults = desired - targetChildren - targetElders;
    target.people = Array.isArray(target.people) ? target.people : [];
    target.nextPersonId = Math.max(1, Math.floor(Number(target.nextPersonId) || 1));
    target.pendingTravellerResidents = Math.max(0, Math.floor(Number(target.pendingTravellerResidents) || 0));
    target.populationChangeProgress = clamp(
      Number.isFinite(Number(target.populationChangeProgress)) ? Number(target.populationChangeProgress) : 0,
      -0.999999,
      0.999999
    );
    const firstRoster = target.people.length === 0 && target.nextPersonId === 1;
    const firstRosterOrigin = target.day <= 1 ? "founder" : "established";
    const currentTime = getWorldTime(target);

    const seenIds = new Set();
    const usedNames = new Set();
    target.people = target.people.filter(person => {
      const id = Math.floor(Number(person?.id));
      if (!id || seenIds.has(id)) return false;
      person.id = id;
      seenIds.add(id);
      return true;
    }).slice(0, desired);
    target.nextPersonId = Math.max(target.nextPersonId, ...target.people.map(person => person.id + 1), 1);

    for (const person of target.people) {
      if (!String(person.name || "").trim() || usedNames.has(person.name)) person.name = generatedPersonName(target, person.id, usedNames);
      usedNames.add(person.name);
      if (!["child", "adult", "elder"].includes(person.ageGroup)) person.ageGroup = "adult";
      person.carryCapacity = clamp(Math.floor(Number(person.carryCapacity) || 1), 1, 3);
      person.carriedAmount = clamp(Math.floor(Number(person.carriedAmount) || 0), 0, person.carryCapacity);
      person.carriedItem = person.carriedAmount ? String(person.carriedItem || "supplies") : "";
      person.workPriority = normaliseWorkPriority(person.workPriority);
      person.workBuildingId = Number.isFinite(Number(person.workBuildingId)) ? Number(person.workBuildingId) : null;
      person.schoolBuildingId = Number.isFinite(Number(person.schoolBuildingId)) ? Number(person.schoolBuildingId) : null;
      person.homeBuildingId = Number.isFinite(Number(person.homeBuildingId)) ? Number(person.homeBuildingId) : null;
      person.tripPhase = person.tripPhase === "deliver" ? "deliver" : "work";
      person.joinedDay = Math.max(1, Math.floor(Number(person.joinedDay) || 1));
      person.origin = ["founder", "established", "village-born", "traveller"].includes(person.origin)
        ? person.origin
        : person.joinedDay <= 1 ? "founder" : "established";
      person.joinedAt = Number.isFinite(Number(person.joinedAt)) ? Number(person.joinedAt) : person.joinedDay;
      const generatedLifecycle = createPersonLifecycle(target, person.id, person.ageGroup, person.origin, currentTime);
      person.elderAgeDays = Number.isFinite(Number(person.elderAgeDays))
        ? clamp(Number(person.elderAgeDays), 35, 40)
        : generatedLifecycle.elderAgeDays;
      const hasNewLifecycle = Number.isFinite(Number(person.birthAt)) && Number.isFinite(Number(person.deathAgeDays));
      if (hasNewLifecycle) {
        person.birthAt = Number(person.birthAt);
        person.deathAgeDays = clamp(Number(person.deathAgeDays), RESIDENT_LIFESPAN_MIN_DAYS, RESIDENT_LIFESPAN_MAX_DAYS);
        person.lifeEndsAt = Number.isFinite(Number(person.lifeEndsAt)) ? Number(person.lifeEndsAt) : person.birthAt + person.deathAgeDays;
      } else {
        const savedLifeEnd = Number(person.lifeEndsAt);
        const savedRemaining = Number.isFinite(savedLifeEnd) ? savedLifeEnd - currentTime : NaN;
        const inferredAge = generatedLifecycle.deathAgeDays - savedRemaining;
        if (Number.isFinite(savedRemaining) && inferredAge >= 0 && inferredAge < generatedLifecycle.deathAgeDays) {
          generatedLifecycle.birthAt = currentTime - inferredAge;
          generatedLifecycle.lifeEndsAt = savedLifeEnd;
        }
        person.birthAt = generatedLifecycle.birthAt;
        person.deathAgeDays = generatedLifecycle.deathAgeDays;
        person.lifeEndsAt = generatedLifecycle.lifeEndsAt;
      }
      person.settlementLifespanDays = person.origin === "traveller"
        ? clamp(person.lifeEndsAt - person.joinedAt, TRAVELLER_LIFESPAN_MIN_DAYS, TRAVELLER_LIFESPAN_MAX_DAYS)
        : person.lifeEndsAt - person.joinedAt;
      person.lifespanStartedAt = person.birthAt;
      person.lifespanDays = person.deathAgeDays;
    }

    const ageCounts = () => ({
      child: target.people.filter(person => person.ageGroup === "child").length,
      adult: target.people.filter(person => person.ageGroup === "adult").length,
      elder: target.people.filter(person => person.ageGroup === "elder").length
    });
    while (target.people.length < desired) {
      const counts = ageCounts();
      const deficits = [
        { age: "child", amount: targetChildren - counts.child },
        { age: "adult", amount: targetAdults - counts.adult },
        { age: "elder", amount: targetElders - counts.elder }
      ].sort((a, b) => b.amount - a.amount);
      const origin = target.pendingTravellerResidents > 0
        ? "traveller"
        : firstRoster ? firstRosterOrigin : "village-born";
      if (origin === "traveller") target.pendingTravellerResidents -= 1;
      target.people.push(createPersonRecord(target, deficits[0].amount > 0 ? deficits[0].age : "child", usedNames, origin));
    }

    // A resident's stage is determined only by their own birthday. Do not
    // reshuffle people between stages to make the aggregate demographics fit.
    syncLifeStagesForState(target, currentTime);
    if (target === state) runtimeIndexState = null;
    return target.people;
  }

  function rebuildRuntimeIndexes() {
    peopleById = new Map((state?.people || []).map(person => [person.id, person]));
    buildingsById = new Map((state?.buildings || []).map(building => [building.id, building]));
    assignedWorkerCounts = new Map();
    nextResidentExpiry = Infinity;
    for (const person of state?.people || []) {
      const lifeEndsAt = Number(person.lifeEndsAt);
      if (Number.isFinite(lifeEndsAt)) nextResidentExpiry = Math.min(nextResidentExpiry, lifeEndsAt);
      if (Number.isInteger(person.workBuildingId)) {
        assignedWorkerCounts.set(person.workBuildingId, (assignedWorkerCounts.get(person.workBuildingId) || 0) + 1);
      }
    }
    runtimeIndexState = state;
    runtimePeopleRef = state?.people || null;
    runtimeBuildingsRef = state?.buildings || null;
    runtimePeopleLength = state?.people?.length || 0;
    runtimeBuildingsLength = state?.buildings?.length || 0;
  }

  function ensureRuntimeIndexes() {
    if (runtimeIndexState !== state
      || runtimePeopleRef !== state?.people
      || runtimeBuildingsRef !== state?.buildings
      || runtimePeopleLength !== (state?.people?.length || 0)
      || runtimeBuildingsLength !== (state?.buildings?.length || 0)) {
      rebuildRuntimeIndexes();
    }
  }

  function getPersonById(id) {
    ensureRuntimeIndexes();
    return peopleById.get(id) || null;
  }

  function getBuildingById(id) {
    ensureRuntimeIndexes();
    return buildingsById.get(id) || null;
  }

  function assignPeopleJobs(target = state, people = normalisePeopleForState(target)) {
    const requiredSlots = [];
    const optionalSlots = [];
    const prioritisedWorkplaces = (target.buildings || [])
      .filter(building => getWorkerCapacity(BUILDINGS[building.type]) > 0)
      .sort((a, b) => getWorkPriorityRank(b.staffingPriority) - getWorkPriorityRank(a.staffingPriority) || a.id - b.id);
    for (const building of prioritisedWorkplaces) {
      building.staffingPriority = normaliseWorkPriority(building.staffingPriority);
      const def = BUILDINGS[building.type];
      const required = Math.max(0, Math.floor(Number(def?.jobs) || 0));
      const capacity = getWorkerCapacity(def);
      for (let slot = 0; slot < required; slot++) requiredSlots.push(building);
      for (let slot = required; slot < capacity; slot++) optionalSlots.push(building);
    }
    const slots = requiredSlots.concat(optionalSlots);
    const eligible = people
      .filter(person => person.ageGroup === "adult" || person.ageGroup === "elder")
      .sort((a, b) => getWorkPriorityRank(b.workPriority) - getWorkPriorityRank(a.workPriority)
        || Number(a.ageGroup === "elder") - Number(b.ageGroup === "elder")
        || a.id - b.id);
    const workerLimit = Math.min(getWorkers(target), eligible.length, slots.length);
    const assignments = new Map();
    for (let index = 0; index < workerLimit; index++) assignments.set(eligible[index].id, slots[index]);

    for (const person of people) {
      const building = assignments.get(person.id) || null;
      const nextWorkId = building?.id || null;
      if (person.workBuildingId !== nextWorkId) {
        person.workBuildingId = nextWorkId;
        person.carriedItem = "";
        person.carriedAmount = 0;
        person.tripPhase = "work";
      }
      if (person.ageGroup === "child") person.workBuildingId = null;
    }

    const schoolPlaces = [];
    for (const building of target.buildings.filter(item => BUILDINGS[item.type]?.schoolSeats && getAssignedWorkersForState(item.id, target) > 0)) {
      for (let seat = 0; seat < BUILDINGS[building.type].schoolSeats; seat++) schoolPlaces.push(building);
    }
    let childIndex = 0;
    for (const person of people) {
      person.schoolBuildingId = person.ageGroup === "child" ? schoolPlaces[childIndex++]?.id || null : null;
    }

    const homePlaces = [];
    for (const building of target.buildings.filter(item => BUILDINGS[item.type]?.housing)) {
      for (let place = 0; place < BUILDINGS[building.type].housing; place++) homePlaces.push(building);
    }
    for (let index = 0; index < people.length; index++) people[index].homeBuildingId = homePlaces[index]?.id || null;
    if (target === state) {
      rosterDirty = false;
      rebuildRuntimeIndexes();
    }
  }

  function syncPeopleRoster() {
    if (!state || !rosterDirty) return state?.people || [];
    const people = normalisePeopleForState();
    assignPeopleJobs(state, people);
    return people;
  }

  function getAssignedWorkersForState(buildingId, target = state) {
    if (target === state) {
      ensureRuntimeIndexes();
      return assignedWorkerCounts.get(buildingId) || 0;
    }
    let count = 0;
    for (const person of target.people || []) if (person.workBuildingId === buildingId) count += 1;
    return count;
  }

  function getAssignedWorkers(buildingId) {
    return getAssignedWorkersForState(buildingId, state);
  }

  function personWorkInfo(person) {
    if (person.ageGroup === "child") {
      const school = getBuildingById(person.schoolBuildingId);
      return school
        ? { title: "Pupil", workplace: BUILDINGS[school.type].name, building: school }
        : { title: "Child", workplace: "Not yet enrolled", building: null };
    }
    const building = getBuildingById(person.workBuildingId);
    if (building) return { title: JOB_TITLES[building.type] || "Worker", workplace: BUILDINGS[building.type].name, building };
    return person.ageGroup === "elder"
      ? { title: "Retired elder", workplace: "No workplace", building: null }
      : { title: "Available worker", workplace: "Unassigned", building: null };
  }

  function getSchoolCapacity(target = state) {
    return target.buildings.reduce((total, building) => total + (getAssignedWorkersForState(building.id, target) > 0 ? BUILDINGS[building.type]?.schoolSeats || 0 : 0), 0);
  }

  function getChildSupport() {
    return state.buildings.reduce((total, building) => total + (BUILDINGS[building.type]?.childSupport || 0), 0);
  }

  function getSchoolCoverage() {
    const children = state.demographics?.children || 0;
    return children <= 0.05 ? 1 : Math.min(1, getSchoolCapacity() / children);
  }

  function getWorkers(target = state) {
    const groups = normaliseDemographics(target);
    return Math.max(0, Math.floor(groups.adults * 0.9 + groups.elders * 0.28));
  }

  function getWorkerEfficiency() {
    const jobs = getJobs();
    return jobs <= 0 ? 1 : Math.min(1, getWorkers() / jobs);
  }

  function buildingUnlocked(def) {
    return !def.unlockPopulation || state.population >= def.unlockPopulation;
  }

  function canAfford(cost) {
    return Object.entries(cost || {}).every(([resource, amount]) => (state.resources[resource] || 0) >= amount);
  }

  function payCost(cost) {
    for (const [resource, amount] of Object.entries(cost || {})) {
      state.resources[resource] = Math.max(0, state.resources[resource] - amount);
    }
  }

  function addResources(effect) {
    for (const key of ["food", "water", "wood", "stone"]) {
      if (effect[key]) storeResource(key, effect[key]);
    }
  }

  function applyEcoEffect(effect, multiplier = 1) {
    if (!effect) return;
    for (const [metric, amount] of Object.entries(effect)) {
      if (metric in state.ecosystem) {
        state.ecosystem[metric] = clamp(state.ecosystem[metric] + amount * multiplier, 0, 100);
      }
    }
    trackEcoStats();
  }

  function isStandingTree(x, y, target = state) {
    if (!inWorld(x, y) || getWaterwayTypeForState(target, x, y) || isClearingForState(target, x, y)) return false;
    if (target.loggedTrees?.[tileIndex(x, y)]) return false;
    const treeNoise = seededNoise(x, y, target.terrainSeed ^ 0x9e3779b9);
    return treeNoise < target.ecosystem.forest / 100 + 0.1;
  }

  function getStandingWildTreeCount(target = state) {
    const forestBand = Math.floor((Number(target?.ecosystem?.forest) || 0) * 2);
    const loggedTreeCount = Object.keys(target?.loggedTrees || {}).length;
    const clearedTileCount = Object.keys(target?.clearedTiles || {}).length;
    if (target === state
      && standingWildTreeCountCache?.state === target
      && standingWildTreeCountCache.forestBand === forestBand
      && standingWildTreeCountCache.loggedTreeCount === loggedTreeCount
      && standingWildTreeCountCache.clearedTileCount === clearedTileCount) {
      return standingWildTreeCountCache.value;
    }
    let trees = 0;
    for (let y = 0; y < WORLD_SIZE; y++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        if (isStandingTree(x, y, target)) trees++;
      }
    }
    if (target === state) {
      standingWildTreeCountCache = { state: target, forestBand, loggedTreeCount, clearedTileCount, value: trees };
    }
    return trees;
  }

  function initialiseAfterFireBurnedTrees(target) {
    if (!target || target.scenarioId !== "burned_watershed" || target.burnedTreeMapInitialised === true) return target?.burnedTrees || {};
    target.burnedTrees = {};
    for (let y = 0; y < WORLD_SIZE; y++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        if (!isStandingTree(x, y, target)) continue;
        if (seededNoise(x, y, target.terrainSeed ^ 0x7a4f32c1) < AFTER_FIRE_BURNED_TREE_SHARE) {
          target.burnedTrees[tileIndex(x, y)] = true;
        }
      }
    }
    target.burnedTreeMapInitialised = true;
    return target.burnedTrees;
  }

  function isBurnedTree(x, y, target = state) {
    return inWorld(x, y) && target?.scenarioId === "burned_watershed" && Boolean(target.burnedTrees?.[tileIndex(x, y)]);
  }

  function getWildTreeAppearance(x, y, target = state) {
    const burned = isBurnedTree(x, y, target);
    const evergreen = !burned && isEvergreenTree(x, y, target?.terrainSeed || 1);
    return {
      burned,
      evergreen,
      leafAmount: burned ? 0 : evergreen ? 1 : getDeciduousCanopyProgress(target),
      trunkColour: burned ? "#111111" : "#5a402b",
      branchColour: burned ? "#1d1b1b" : "#62462f"
    };
  }

  function clearAdjacentTreelessFireScar(x, y, target = state) {
    if (target?.scenarioId !== "burned_watershed") return [];
    target.clearedTiles = target.clearedTiles || {};
    target.burnedTrees = target.burnedTrees || {};
    const opened = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const tileX = x + dx;
        const tileY = y + dy;
        if (!inWorld(tileX, tileY) || getWaterwayTypeForState(target, tileX, tileY)) continue;
        const index = tileIndex(tileX, tileY);
        if (isClearingForState(target, tileX, tileY) || target.occupancy?.[index]) continue;
        if (target.loggedTrees?.[index] || isStandingTree(tileX, tileY, target)) continue;
        target.clearedTiles[index] = target.day;
        delete target.burnedTrees[index];
        if (target.priorityTrees) delete target.priorityTrees[index];
        if (target.priorityStumps) delete target.priorityStumps[index];
        if (target.remoteStumps) delete target.remoteStumps[index];
        opened.push({ x: tileX, y: tileY, index });
      }
    }
    return opened;
  }

  function getBaseWildTreeTimberYield(x, y, target = state) {
    const range = TREE_TIMBER_MAX - TREE_TIMBER_MIN + 1;
    return Math.min(TREE_TIMBER_MAX, TREE_TIMBER_MIN + Math.floor(seededNoise(x, y, target.terrainSeed ^ 0x51f15e5d) * range));
  }

  function getWildTreeTimberYield(x, y, target = state) {
    const baseYield = getBaseWildTreeTimberYield(x, y, target);
    return isBurnedTree(x, y, target)
      ? Math.round(baseYield * BURNED_TREE_TIMBER_MULTIPLIER * 10) / 10
      : baseYield;
  }

  function getManagedTreeTimberYield(farm, plotIndex, target = state) {
    const range = TREE_TIMBER_MAX - TREE_TIMBER_MIN + 1;
    const farmKey = Math.max(1, Math.floor(Number(farm?.id) || 1));
    const plotKey = Math.max(0, Math.floor(Number(plotIndex) || 0));
    return Math.min(TREE_TIMBER_MAX, TREE_TIMBER_MIN + Math.floor(seededNoise(farmKey * 31 + plotKey, plotKey + 307, target.terrainSeed ^ 0x2c1b3c6d) * range));
  }

  function getLoggingTargetTimberYield(loggingTarget, target = state) {
    if (!loggingTarget) return 0;
    return loggingTarget.kind === "farm"
      ? getManagedTreeTimberYield(loggingTarget.farm, loggingTarget.index, target)
      : getWildTreeTimberYield(loggingTarget.x, loggingTarget.y, target);
  }

  function isTimberStorageFull(target = state) {
    const capacity = getStorageCapacity("wood", target);
    return capacity <= 0 || Number(target.resources?.wood || 0) >= capacity - 0.0001;
  }

  function getNextLoggingStorageNeed(building, target = state) {
    if (!building || building.type !== "lumber") return 0;
    const loggingTarget = getLoggingTarget(building, target);
    const workStumps = getLoggingWorkStumps(building, target);
    if (workStumps.length && !loggingTarget?.priority) return 1;
    if (loggingTarget) return getLoggingTargetTimberYield(loggingTarget, target);
    return workStumps.length ? 1 : 0;
  }

  function isLoggingStorageBlocked(building, target = state) {
    if (building?.type !== "lumber" || building.workWhenStorageFull === true) return false;
    const requiredSpace = getNextLoggingStorageNeed(building, target);
    if (requiredSpace <= 0) return false;
    const freeSpace = Math.max(0, getStorageCapacity("wood", target) - Number(target.resources?.wood || 0));
    return freeSpace + 0.0001 < requiredSpace;
  }

  function isTreeInLoggingRange(building, x, y) {
    if (!building || building.type !== "lumber") return false;
    const centreX = building.x + building.w / 2;
    const centreY = building.y + building.h / 2;
    const dx = x + 0.5 - centreX;
    const dy = y + 0.5 - centreY;
    return dx * dx + dy * dy <= LOGGER_RANGE * LOGGER_RANGE;
  }

  function getLoggingTreesInRange(building, target = state) {
    if (!building || building.type !== "lumber") return [];
    const centreX = building.x + building.w / 2;
    const centreY = building.y + building.h / 2;
    const trees = [];
    for (let y = Math.floor(centreY - LOGGER_RANGE); y <= Math.ceil(centreY + LOGGER_RANGE); y++) {
      for (let x = Math.floor(centreX - LOGGER_RANGE); x <= Math.ceil(centreX + LOGGER_RANGE); x++) {
        const dx = x + 0.5 - centreX;
        const dy = y + 0.5 - centreY;
        if (isTreeInLoggingRange(building, x, y) && isStandingTree(x, y, target)) {
          trees.push({ x, y, distance: dx * dx + dy * dy });
        }
      }
    }
    return trees.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
  }

  function getNearestLoggingTreeOutsideRange(building, target = state) {
    if (!building || building.type !== "lumber") return null;
    const forestBand = Math.floor((Number(target.ecosystem?.forest) || 0) * 2);
    const cached = target === state ? remoteLoggingTargetCache.get(building.id) : null;
    if (cached?.forestBand === forestBand && (!cached.target || isStandingTree(cached.target.x, cached.target.y, target))) {
      return cached.target;
    }
    const centreX = building.x + building.w / 2;
    const centreY = building.y + building.h / 2;
    const rangeSquared = LOGGER_RANGE * LOGGER_RANGE;
    let nearest = null;
    for (let y = 0; y < WORLD_SIZE; y++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        if (!isStandingTree(x, y, target)) continue;
        const distance = (x + 0.5 - centreX) ** 2 + (y + 0.5 - centreY) ** 2;
        if (distance <= rangeSquared) continue;
        if (!nearest || distance < nearest.distance || (distance === nearest.distance && (y < nearest.y || (y === nearest.y && x < nearest.x)))) {
          nearest = { x, y, index: tileIndex(x, y), distance, inRange: false, remote: true };
        }
      }
    }
    if (target === state) remoteLoggingTargetCache.set(building.id, { forestBand, target: nearest });
    return nearest;
  }

  function getPrioritizedTrees(target = state) {
    target.priorityTrees = target.priorityTrees || {};
    const trees = [];
    for (const [rawIndex, prioritizedAt] of Object.entries(target.priorityTrees)) {
      const index = Number(rawIndex);
      const x = index % WORLD_SIZE;
      const y = Math.floor(index / WORLD_SIZE);
      if (!Number.isInteger(index) || !isStandingTree(x, y, target)) {
        delete target.priorityTrees[rawIndex];
        continue;
      }
      trees.push({ x, y, index, prioritizedAt: Number(prioritizedAt) || 0 });
    }
    return trees.sort((a, b) => a.prioritizedAt - b.prioritizedAt || a.index - b.index);
  }

  function getPriorityTreeForCamp(building, target = state) {
    if (!building || building.type !== "lumber") return null;
    const centreX = building.x + building.w / 2;
    const centreY = building.y + building.h / 2;
    return getPrioritizedTrees(target)
      .map(tree => ({
        ...tree,
        inRange: isTreeInLoggingRange(building, tree.x, tree.y),
        distance: (tree.x + 0.5 - centreX) ** 2 + (tree.y + 0.5 - centreY) ** 2
      }))
      .sort((a, b) => a.distance - b.distance || a.prioritizedAt - b.prioritizedAt || a.index - b.index)[0] || null;
  }

  function getLoggingStumpsInRange(building, target = state) {
    if (!building || building.type !== "lumber") return [];
    const centreX = building.x + building.w / 2;
    const centreY = building.y + building.h / 2;
    const stumps = [];
    for (let y = Math.floor(centreY - LOGGER_RANGE); y <= Math.ceil(centreY + LOGGER_RANGE); y++) {
      for (let x = Math.floor(centreX - LOGGER_RANGE); x <= Math.ceil(centreX + LOGGER_RANGE); x++) {
        const index = tileIndex(x, y);
        const dx = x + 0.5 - centreX;
        const dy = y + 0.5 - centreY;
        if (inWorld(x, y) && !getWaterwayTypeForState(target, x, y) && dx * dx + dy * dy <= LOGGER_RANGE * LOGGER_RANGE && target.loggedTrees?.[index] && !target.clearedTiles?.[index]) {
          stumps.push({ x, y, index, distance: dx * dx + dy * dy, priority: Boolean(target.priorityStumps?.[index]) });
        }
      }
    }
    return stumps.sort((a, b) => {
      const ageDifference = Number(target.loggedTrees?.[a.index] || 0) - Number(target.loggedTrees?.[b.index] || 0);
      return ageDifference || a.distance - b.distance || a.y - b.y || a.x - b.x;
    });
  }

  function getRemoteLoggingStumps(building, target = state) {
    if (!building || building.type !== "lumber") return [];
    target.remoteStumps = target.remoteStumps || {};
    const centreX = building.x + building.w / 2;
    const centreY = building.y + building.h / 2;
    const stumps = [];
    for (const [rawIndex, campId] of Object.entries(target.remoteStumps)) {
      const index = Number(rawIndex);
      if (Number(campId) !== building.id) continue;
      const x = index % WORLD_SIZE;
      const y = Math.floor(index / WORLD_SIZE);
      if (!target.loggedTrees?.[index] || target.clearedTiles?.[index] || getWaterwayTypeForState(target, x, y)) {
        delete target.remoteStumps[rawIndex];
        continue;
      }
      stumps.push({ x, y, index, distance: (x + 0.5 - centreX) ** 2 + (y + 0.5 - centreY) ** 2, remote: true, priority: Boolean(target.priorityStumps?.[index]) });
    }
    return stumps.sort((a, b) => a.distance - b.distance || a.index - b.index);
  }

  function getLoggingWorkStumps(building, target = state) {
    const byIndex = new Map();
    for (const stump of [...getLoggingStumpsInRange(building, target), ...getRemoteLoggingStumps(building, target)]) byIndex.set(stump.index, stump);
    return [...byIndex.values()].sort((a, b) => {
      const ageDifference = Number(target.loggedTrees?.[a.index] || 0) - Number(target.loggedTrees?.[b.index] || 0);
      if (Number(b.priority) !== Number(a.priority)) return Number(b.priority) - Number(a.priority);
      if (a.priority) return a.distance - b.distance || a.index - b.index;
      return Number(a.remote) - Number(b.remote) || ageDifference || a.distance - b.distance;
    });
  }

  function getPriorityStumps(target = state) {
    target.priorityStumps = target.priorityStumps || {};
    return Object.keys(target.priorityStumps).reduce((stumps, rawIndex) => {
      const index = Number(rawIndex);
      const x = index % WORLD_SIZE;
      const y = Math.floor(index / WORLD_SIZE);
      if (!Number.isInteger(index) || !target.loggedTrees?.[index] || target.clearedTiles?.[index] || getWaterwayTypeForState(target, x, y)) {
        delete target.priorityStumps[rawIndex];
        return stumps;
      }
      stumps.push({ index, x, y, campId: Number(target.priorityStumps[rawIndex]) || null });
      return stumps;
    }, []);
  }

  function getPriorityStumpForCamp(building, target = state) {
    if (!building || building.type !== "lumber") return null;
    const centreX = building.x + building.w / 2;
    const centreY = building.y + building.h / 2;
    return getPriorityStumps(target)
      .map(stump => ({
        ...stump,
        inRange: isTreeInLoggingRange(building, stump.x, stump.y),
        distance: (stump.x + 0.5 - centreX) ** 2 + (stump.y + 0.5 - centreY) ** 2
      }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index)[0] || null;
  }

  function getWoodFarmPlotAge(building, plotIndex, target = state) {
    normaliseWoodFarmPlots(building, target);
    return Math.max(0, getWorldTime(target) - building.woodFarmPlots[plotIndex]);
  }

  function getMatureWoodFarmPlots(building, target = state) {
    if (!building || building.type !== "wood_farm") return [];
    normaliseWoodFarmPlots(building, target);
    return building.woodFarmPlots
      .map((_, index) => ({ index, age: getWoodFarmPlotAge(building, index, target) }))
      .filter(plot => plot.age >= WOOD_FARM_GROWTH_DAYS);
  }

  function woodFarmTouchesLoggingZone(camp, farm) {
    if (!camp || camp.type !== "lumber" || !farm || farm.type !== "wood_farm") return false;
    const centreX = camp.x + camp.w / 2;
    const centreY = camp.y + camp.h / 2;
    for (let y = farm.y; y < farm.y + farm.h; y++) {
      for (let x = farm.x; x < farm.x + farm.w; x++) {
        const dx = x + 0.5 - centreX;
        const dy = y + 0.5 - centreY;
        if (dx * dx + dy * dy <= LOGGER_RANGE * LOGGER_RANGE) return true;
      }
    }
    return false;
  }

  function getWoodFarmsInRange(camp, target = state) {
    if (!camp || camp.type !== "lumber") return [];
    return target.buildings.filter(building => building.type === "wood_farm" && woodFarmTouchesLoggingZone(camp, building));
  }

  function getMatureWoodFarmSupply(camp, target = state) {
    return getWoodFarmsInRange(camp, target).flatMap(farm => getMatureWoodFarmPlots(farm, target).map(plot => ({ farm, ...plot })));
  }

  function getNextWoodFarmMaturity(camp, target = state) {
    const farms = getWoodFarmsInRange(camp, target);
    if (!farms.length) return null;
    return farms.reduce((soonest, farm) => {
      normaliseWoodFarmPlots(farm, target);
      for (let index = 0; index < WOOD_FARM_PLOTS; index++) {
        const remaining = Math.max(0, WOOD_FARM_GROWTH_DAYS - getWoodFarmPlotAge(farm, index, target));
        if (soonest === null || remaining < soonest) soonest = remaining;
      }
      return soonest;
    }, null);
  }

  function harvestMatureWoodFarmTree(camp, requestedSupply = null, target = state) {
    const supply = requestedSupply?.farm && Number.isInteger(requestedSupply.index)
      ? requestedSupply
      : getMatureWoodFarmSupply(camp, target)[0];
    if (!supply) return false;
    if (getWoodFarmPlotAge(supply.farm, supply.index, target) < WOOD_FARM_GROWTH_DAYS) return false;
    supply.farm.woodFarmPlots[supply.index] = getWorldTime(target);
    target.stats.woodFarmTreesHarvested = (target.stats.woodFarmTreesHarvested || 0) + 1;
    if (target === state && target.stats.woodFarmTreesHarvested % 16 === 0) {
      addLog(`Managed groves have supplied ${target.stats.woodFarmTreesHarvested} trees to nearby Logging Camps.`, true);
    }
    return true;
  }

  function selectLoggingTarget(priority, managed, localTree, remoteTree = null) {
    if (priority) return { kind: "wild", ...priority, priority: true };
    if (managed) return { kind: "farm", ...managed, inRange: true, priority: false };
    if (localTree) return { kind: "wild", ...localTree, index: tileIndex(localTree.x, localTree.y), inRange: true, priority: false };
    return remoteTree ? { kind: "wild", ...remoteTree, priority: false } : null;
  }

  function getLoggingTarget(building, target = state) {
    const priority = getPriorityTreeForCamp(building, target);
    const managed = getMatureWoodFarmSupply(building, target)[0];
    const localTree = getLoggingTreesInRange(building, target)[0];
    return selectLoggingTarget(
      priority,
      managed,
      localTree,
      !priority && !managed && !localTree ? getNearestLoggingTreeOutsideRange(building, target) : null
    );
  }

  function getLoggingFellingRate(building, loggingTarget = getLoggingTarget(building), target = state, staffedProductionActive = !isVillagerNight(target)) {
    if (!building || building.type !== "lumber" || !loggingTarget || !staffedProductionActive || isLoggingStorageBlocked(building, target)) return 0;
    const assigned = Math.min(getWorkerCapacity(BUILDINGS.lumber), (target.people || []).filter(person => person.workBuildingId === building.id).length);
    if (!assigned) return 0;
    const weather = target === state ? getWeather() : WEATHERS[target.weather] || WEATHERS.mild;
    const forestFactor = 0.28 + target.ecosystem.forest * 0.008;
    const marketBoost = 1 + Math.min(0.22, getOperationalBuildingUnits("market", target, staffedProductionActive) * 0.055);
    const skillBoost = 0.96 + target.education * 0.0016;
    const illnessActive = Number(target.buffs?.illnessUntil) > getWorldTime(target);
    const clinicProtection = Math.min(0.65, getOperationalBuildingUnits("clinic", target, staffedProductionActive) * 0.2);
    const illnessWorkFactor = illnessActive ? 0.72 + clinicProtection * 0.35 : 1;
    const zoneMultiplier = loggingTarget.inRange ? IN_RANGE_LOGGING_MULTIPLIER : 1;
    return assigned * BASE_TREE_FELLING_RATE * zoneMultiplier * weather.wood * forestFactor * marketBoost * skillBoost * illnessWorkFactor;
  }

  function getLoggingStumpRate(building, stump = null, target = state, staffedProductionActive = !isVillagerNight(target)) {
    if (!stump) stump = getLoggingWorkStumps(building, target)[0];
    if (!stump) return 0;
    const matchingTreeWork = {
      kind: "wild",
      x: stump.x,
      y: stump.y,
      inRange: isTreeInLoggingRange(building, stump.x, stump.y)
    };
    return getLoggingFellingRate(building, matchingTreeWork, target, staffedProductionActive);
  }

  function getProjectedLoggingTimberRate(building, target = state, staffedProductionActive = !isVillagerNight(target)) {
    if (!staffedProductionActive) return 0;
    const loggingTarget = getLoggingTarget(building, target);
    const workStumps = getLoggingWorkStumps(building, target);
    const firstStumpRate = getLoggingStumpRate(building, workStumps[0], target, staffedProductionActive);
    if (!loggingTarget) return workStumps.length && firstStumpRate > 0 ? firstStumpRate : 0;
    const fellingRate = getLoggingFellingRate(building, loggingTarget, target, staffedProductionActive);
    if (fellingRate <= 0) return 0;
    const timberYield = getLoggingTargetTimberYield(loggingTarget, target);
    const queuedStumps = loggingTarget.priority ? [] : workStumps;
    const queuedStumpDays = queuedStumps.reduce((days, stump) => {
      const rate = getLoggingStumpRate(building, stump, target, staffedProductionActive);
      return days + (rate > 0 ? 1 / rate : 0);
    }, 0);
    const resultingStumpRate = loggingTarget.kind === "wild"
      ? getLoggingStumpRate(building, loggingTarget, target, staffedProductionActive)
      : 0;
    const resultingStumpDays = resultingStumpRate > 0 ? 1 / resultingStumpRate : 0;
    const totalStumps = queuedStumps.length + Number(resultingStumpRate > 0);
    const workDays = 1 / fellingRate + queuedStumpDays + resultingStumpDays;
    return (timberYield + totalStumps) / workDays;
  }

  function getLoggingAccessFactor(building, target = state) {
    const priority = getPriorityTreeForCamp(building, target);
    if (priority) return priority.inRange ? Math.max(0.1, clamp(getLoggingTreesInRange(building, target).length / 18, 0, 1)) : 0.1;
    const wildTreeAccess = clamp(getLoggingTreesInRange(building, target).length / 18, 0, 1);
    if (getMatureWoodFarmSupply(building, target).length) return 1;
    return wildTreeAccess || (getNearestLoggingTreeOutsideRange(building, target) ? 0.1 : 0);
  }

  function buildingGap(a, b) {
    const dx = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), 0);
    const dy = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h), 0);
    return Math.max(dx, dy);
  }

  function getCropPollutionInfo(crop) {
    if (!["farm", "orchard"].includes(crop?.type)) return { factor: 1, penalty: 0, sources: [] };
    const sources = [];
    let penalty = 0;
    for (const building of state.buildings) {
      if (building.id === crop.id) continue;
      const strength = BUILDINGS[building.type]?.pollution || 0;
      if (!strength) continue;
      const distance = buildingGap(crop, building);
      if (distance > CROP_POLLUTION_RANGE) continue;
      const contribution = 0.08 * strength * (1 - distance / (CROP_POLLUTION_RANGE + 1));
      if (contribution <= 0) continue;
      penalty += contribution;
      sources.push({ building, contribution });
    }
    return { factor: clamp(1 - penalty, 0.35, 1), penalty: clamp(penalty, 0, 0.65), sources };
  }

  function getLocalProductionFactor(building) {
    return ["farm", "orchard"].includes(building?.type) ? getCropPollutionInfo(building).factor : 1;
  }

  function getForestPollutionInfo(building) {
    if (!(BUILDINGS[building.type]?.pollution > 0)) return { trees: 0, penalty: 0 };
    let trees = 0;
    for (let y = building.y - 1; y <= building.y + building.h; y++) {
      for (let x = building.x - 1; x <= building.x + building.w; x++) {
        const inside = x >= building.x && x < building.x + building.w && y >= building.y && y < building.y + building.h;
        if (!inside && isStandingTree(x, y)) trees += 1;
      }
    }
    return { trees, penalty: trees * 0.1 };
  }

  function getNoiseOperationFactor(building, target = state, staffedProductionActive = !isVillagerNight(target)) {
    const def = BUILDINGS[building?.type];
    if (!(def?.noise > 0)) return 0;
    const operation = getBuildingOperationFactor(building, target, staffedProductionActive);
    if (operation <= 0) return 0;
    if (building.type === "lumber") {
      if (isLoggingStorageBlocked(building, target)) return 0;
      if (!getLoggingTarget(building, target) && !getLoggingWorkStumps(building, target).length) return 0;
    }
    return operation;
  }

  function getNoiseActivity(building, target = state, staffedProductionActive = null) {
    if (staffedProductionActive === null) {
      const day = getNoiseOperationFactor(building, target, true);
      const night = getNoiseOperationFactor(building, target, false);
      const dayFraction = getStaffedShiftDayFraction(target);
      return day * dayFraction + night * (1 - dayFraction);
    }
    return getNoiseOperationFactor(building, target, Boolean(staffedProductionActive));
  }

  function getNoiseSourceHousingInfo(source, target = state, staffedProductionActive = null) {
    const def = BUILDINGS[source?.type];
    if (!(def?.noise > 0)) {
      return { homesInRange: 0, occupiedHomes: 0, exposedResidents: 0, averageExposure: 0, moodLoss: 0, healthLoss: 0, activity: 0, range: 0, homes: [] };
    }
    const activity = getNoiseActivity(source, target, staffedProductionActive);
    const noiseRange = getNoisePollutionRange(source);
    const homes = (target.buildings || [])
      .filter(building => BUILDINGS[building.type]?.housing)
      .map(building => {
        const distance = buildingGap(source, building);
        const residents = (target.people || []).filter(person => person.homeBuildingId === building.id).length;
        const baseExposure = distance <= noiseRange
          ? def.noise * (1 - distance / (noiseRange + 1))
          : 0;
        return { building, distance, residents, exposure: baseExposure * activity };
      })
      .filter(home => home.distance <= noiseRange);
    const residentExposure = homes.reduce((sum, home) => sum + home.exposure * home.residents, 0);
    const population = Math.max(1, (target.people || []).length);
    const averageExposure = residentExposure / population;
    return {
      homesInRange: homes.length,
      occupiedHomes: homes.filter(home => home.residents > 0).length,
      exposedResidents: homes.reduce((sum, home) => sum + home.residents, 0),
      averageExposure,
      moodLoss: averageExposure * NOISE_MORALE_LOSS_PER_EXPOSURE,
      healthLoss: averageExposure * NOISE_HEALTH_LOSS_PER_EXPOSURE,
      activity,
      range: noiseRange,
      homes
    };
  }

  function getHousingNoiseInfo(house, target = state, staffedProductionActive = null) {
    const residents = (target.people || []).filter(person => person.homeBuildingId === house?.id).length;
    if (!BUILDINGS[house?.type]?.housing) return { residents: 0, sourcesInRange: 0, sources: [], exposure: 0, moodLoss: 0, healthLoss: 0 };
    const sources = (target.buildings || [])
      .filter(building => BUILDINGS[building.type]?.noise > 0)
      .map(building => {
        const distance = buildingGap(house, building);
        const activity = getNoiseActivity(building, target, staffedProductionActive);
        const noiseRange = getNoisePollutionRange(building);
        const exposure = distance <= noiseRange
          ? BUILDINGS[building.type].noise * (1 - distance / (noiseRange + 1)) * activity
          : 0;
        return { building, distance, activity, exposure };
      })
      .filter(source => source.distance <= getNoisePollutionRange(source.building));
    const exposure = sources.reduce((sum, source) => sum + source.exposure, 0);
    return {
      residents,
      sourcesInRange: sources.length,
      sources: sources.filter(source => source.exposure > 0.00001),
      exposure,
      moodLoss: exposure * NOISE_MORALE_LOSS_PER_EXPOSURE,
      healthLoss: exposure * NOISE_HEALTH_LOSS_PER_EXPOSURE
    };
  }

  function getVillageNoiseReport(target = state, staffedProductionActive = null) {
    const residentCounts = new Map();
    for (const person of target.people || []) {
      if (person.homeBuildingId) residentCounts.set(person.homeBuildingId, (residentCounts.get(person.homeBuildingId) || 0) + 1);
    }
    const noiseSources = (target.buildings || [])
      .filter(building => BUILDINGS[building.type]?.noise > 0)
      .map(building => ({ building, activity: getNoiseActivity(building, target, staffedProductionActive) }));
    const homes = (target.buildings || [])
      .filter(building => BUILDINGS[building.type]?.housing)
      .map(building => {
        const sourcesInRange = noiseSources
          .map(source => {
            const distance = buildingGap(building, source.building);
            const noiseRange = getNoisePollutionRange(source.building);
            const exposure = distance <= noiseRange
              ? BUILDINGS[source.building.type].noise * (1 - distance / (noiseRange + 1)) * source.activity
              : 0;
            return { ...source, distance, exposure };
          })
          .filter(source => source.distance <= getNoisePollutionRange(source.building));
        const exposure = sourcesInRange.reduce((sum, source) => sum + source.exposure, 0);
        return {
          building,
          residents: residentCounts.get(building.id) || 0,
          sourcesInRange: sourcesInRange.length,
          sources: sourcesInRange.filter(source => source.exposure > 0.00001),
          exposure,
          moodLoss: exposure * NOISE_MORALE_LOSS_PER_EXPOSURE,
          healthLoss: exposure * NOISE_HEALTH_LOSS_PER_EXPOSURE
        };
      });
    const population = Math.max(1, (target.people || []).length);
    const residentExposure = homes.reduce((sum, home) => sum + home.exposure * home.residents, 0);
    const averageExposure = residentExposure / population;
    return {
      sourceCount: noiseSources.length,
      activeSourceCount: noiseSources.filter(source => source.activity > 0).length,
      homesInRange: homes.filter(home => home.sourcesInRange > 0).length,
      exposedHomes: homes.filter(home => home.residents > 0 && home.exposure > 0.00001).length,
      exposedResidents: homes.filter(home => home.exposure > 0.00001).reduce((sum, home) => sum + home.residents, 0),
      averageExposure,
      moodLoss: averageExposure * NOISE_MORALE_LOSS_PER_EXPOSURE,
      healthLoss: averageExposure * NOISE_HEALTH_LOSS_PER_EXPOSURE,
      homes
    };
  }

  function updateLogging(deltaDays) {
    state.loggedTrees = state.loggedTrees || {};
    state.priorityTrees = state.priorityTrees || {};
    state.priorityStumps = state.priorityStumps || {};
    state.remoteStumps = state.remoteStumps || {};
    state.clearedTiles = state.clearedTiles || {};
    if (isVillagerNight()) return;
    const activeCamps = state.buildings.filter(item => item.type === "lumber" && getAssignedWorkers(item.id) > 0 && !isLoggingStorageBlocked(item));
    const outsideLoggingGroups = new Map();
    for (const camp of activeCamps) {
      const priorityStump = getPriorityStumpForCamp(camp);
      const loggingTarget = priorityStump ? null : getLoggingTarget(camp);
      const workTarget = priorityStump || loggingTarget;
      const canWork = priorityStump || (loggingTarget && (loggingTarget.priority || !getLoggingWorkStumps(camp).length));
      if (!canWork || workTarget.inRange) continue;
      const key = `${priorityStump ? "stump" : "tree"}:${workTarget.index}`;
      if (!outsideLoggingGroups.has(key)) outsideLoggingGroups.set(key, []);
      outsideLoggingGroups.get(key).push(camp);
    }
    for (const building of activeCamps) {
      const assigned = getAssignedWorkers(building.id);
      const waitingStumps = getLoggingWorkStumps(building);
      const priorityStump = getPriorityStumpForCamp(building);
      const loggingTarget = getLoggingTarget(building);
      // A manually marked stump is the most urgent clearing work; marked trees still outrank ordinary stumps.
      const priorityStumpActive = Boolean(priorityStump);
      const priorityTreeActive = Boolean(loggingTarget?.priority) && !priorityStumpActive;
      const activeStump = priorityStump || waitingStumps[0] || null;
      const outsideLoggingTarget = priorityStumpActive && !priorityStump.inRange
        ? `stump:${priorityStump.index}`
        : !priorityStumpActive && loggingTarget && !loggingTarget.inRange && (priorityTreeActive || !waitingStumps.length)
          ? `tree:${loggingTarget.index}`
          : null;
      const sharedCamps = outsideLoggingTarget ? outsideLoggingGroups.get(outsideLoggingTarget) || [building] : [building];
      // One camp owns the shared progress bar. The others contribute their
      // assigned workers, so no partly completed work is carried to a new job.
      if (sharedCamps[0]?.id !== building.id) {
        building.stumpProgress = 0;
        building.loggingProgress = 0;
        continue;
      }
      // Logging rates are calibrated for two workers. This makes every logger
      // worth half of that standard crew, including when several camps join an
      // outside-zone tree target.
      const sharedWorkerMultiplier = sharedCamps.reduce((total, camp) => total + getAssignedWorkers(camp.id), 0) / assigned;
      const stumpWorkers = priorityStumpActive || (!priorityTreeActive && waitingStumps.length) ? assigned : 0;
      const fellers = !priorityStumpActive && (priorityTreeActive || !waitingStumps.length) ? assigned : 0;
      building.stumpProgress = Math.max(0, Number(building.stumpProgress) || 0) + deltaDays * (stumpWorkers > 0 ? getLoggingStumpRate(building, activeStump) * sharedWorkerMultiplier : 0);
      building.loggingProgress = Math.max(0, Number(building.loggingProgress) || 0) + deltaDays * (fellers > 0 ? getLoggingFellingRate(building, loggingTarget) * sharedWorkerMultiplier : 0);

      while (stumpWorkers > 0 && building.stumpProgress >= 1) {
        const stump = priorityStump && state.loggedTrees?.[priorityStump.index]
          ? priorityStump
          : getLoggingWorkStumps(building)[0];
        if (!stump) {
          building.stumpProgress = 0;
          break;
        }
        const wasPriorityStump = Boolean(state.priorityStumps[stump.index]);
        delete state.loggedTrees[stump.index];
        delete state.priorityStumps[stump.index];
        delete state.remoteStumps[stump.index];
        state.clearedTiles[stump.index] = state.day;
        const openedFireScar = clearAdjacentTreelessFireScar(stump.x, stump.y);
        const storedTimber = storeResource("wood", 1);
        building.stumpProgress -= 1;
        state.stats.stumpsRemoved = (state.stats.stumpsRemoved || 0) + 1;
        const previousFireScarTotal = state.stats.fireScarTilesCleared || 0;
        state.stats.fireScarTilesCleared = previousFireScarTotal + openedFireScar.length;
        if (wasPriorityStump) state.stats.priorityStumpsRemoved = (state.stats.priorityStumpsRemoved || 0) + 1;
        applyEcoEffect({ soil: -0.04 - openedFireScar.length * 0.012, biodiversity: -0.02 - openedFireScar.length * 0.006 });
        if (openedFireScar.length && previousFireScarTotal === 0) {
          showToast("Fire scar opened", `${openedFireScar.length} adjacent treeless forest tile${openedFireScar.length === 1 ? " became" : "s became"} buildable clearing. Water channels remain protected.`, "ϟ");
        }
        if (openedFireScar.length) addLog(`Removing the stump at ${stump.x + 1}, ${stump.y + 1} opened ${openedFireScar.length} adjacent treeless fire-scar tile${openedFireScar.length === 1 ? "" : "s"}. Bare soil still carries a small ecological cost.`);
        if (wasPriorityStump) {
          showToast("Priority stump cleared", storedTimber > 0 ? "Workers stored 1 timber and opened the marked tile." : "The marked tile became clearing, but timber storage was full.", storedTimber > 0 ? "+1" : "!");
          addLog(`The high-priority stump at ${stump.x + 1}, ${stump.y + 1} was cleared before ordinary stump work.`);
        } else if (state.stats.stumpsRemoved === 1) {
          showToast("Stump removed", storedTimber > 0 ? "A worker stored 1 timber and opened a new clearing tile." : "The tile became clearing, but timber storage was full.", storedTimber > 0 ? "+1" : "!");
        }
        if (state.stats.stumpsRemoved % 10 === 0) addLog(`Workers have removed ${state.stats.stumpsRemoved} stumps and opened ${state.stats.fireScarTilesCleared || 0} additional treeless fire-scar tiles.`, true);
      }

      while (fellers > 0 && building.loggingProgress >= 1) {
        const target = getLoggingTarget(building);
        if (getLoggingWorkStumps(building).length && !target?.priority) break;
        if (!target) {
          building.loggingProgress = 0;
          break;
        }
        const timberYield = getLoggingTargetTimberYield(target);
        let harvested = false;
        if (target?.kind === "wild") {
          state.loggedTrees[target.index] = state.day;
          if (!target.inRange) state.remoteStumps[target.index] = building.id;
          if (target.priority) {
            delete state.priorityTrees[target.index];
            state.priorityStumps[target.index] = building.id;
            state.stats.priorityTreesFelled = (state.stats.priorityTreesFelled || 0) + 1;
            // Progress made on an older ordinary stump cannot be transferred to
            // the new high-priority stump at a different tile.
            building.stumpProgress = 0;
          }
          state.stats.treesLogged = (state.stats.treesLogged || 0) + 1;
          harvested = true;
        } else if (target?.kind === "farm") {
          harvested = harvestMatureWoodFarmTree(building, target);
        }
        if (!harvested) {
          building.loggingProgress = 0;
          break;
        }
        const storedTimber = storeResource("wood", timberYield);
        building.lastTreeTimberYield = timberYield;
        building.lastTreeTimberStored = storedTimber;
        building.lastTreeHarvestAt = getWorldTime();
        state.stats.treeTimberYielded = (state.stats.treeTimberYielded || 0) + timberYield;
        state.stats.treeTimberStored = (state.stats.treeTimberStored || 0) + storedTimber;
        state.stats.lastTreeTimberYield = timberYield;
        if (target.kind === "wild" && state.stats.treesLogged % 10 === 0) {
          addLog(`Village loggers have felled ${state.stats.treesLogged} mapped forest trees and recovered ${state.stats.treeTimberYielded} timber from all tree harvests.`, true);
        }
        building.loggingProgress -= 1;
      }
    }
  }

  function applyPopulationChange(amount, mix = null, options = {}) {
    if (!amount) return;
    // Residents cannot be fractional. Keep gradual natural growth and decline
    // between simulation ticks, then materialise a birth or loss only when a
    // complete resident has accumulated. Without this, roster syncing floors
    // every tiny growth tick back to the old population before it can add up.
    if (options.origin !== "traveller") {
      if (amount < 0 && state.population <= 0) {
        state.populationChangeProgress = 0;
        return;
      }
      const progress = (Number(state.populationChangeProgress) || 0) + amount;
      const wholeResidents = progress > 0 ? Math.floor(progress) : Math.ceil(progress);
      state.populationChangeProgress = progress - wholeResidents;
      amount = wholeResidents;
      if (!amount) return;
    }
    const groups = normaliseDemographics();
    if (amount < 0) {
      const remaining = Math.max(0, state.population + amount);
      const scale = state.population > 0 ? remaining / state.population : 0;
      groups.children *= scale;
      groups.adults *= scale;
      groups.elders *= scale;
    } else {
      if (options.origin === "traveller") {
        const arrivals = Math.max(0, Math.floor(amount));
        state.pendingTravellerResidents = (state.pendingTravellerResidents || 0) + arrivals;
        state.stats.travellingSettlersWelcomed = (state.stats.travellingSettlersWelcomed || 0) + arrivals;
      }
      const shares = mix || { children: 0.72, adults: 0.25, elders: 0.03 };
      const shareTotal = Math.max(0.001, (shares.children || 0) + (shares.adults || 0) + (shares.elders || 0));
      groups.children += amount * (shares.children || 0) / shareTotal;
      groups.adults += amount * (shares.adults || 0) / shareTotal;
      groups.elders += amount * (shares.elders || 0) / shareTotal;
    }
    state.population = groups.children + groups.adults + groups.elders;
    if (state.population <= 0 && amount < 0) state.populationChangeProgress = 0;
    rosterDirty = true;
  }

  function expireResidents(atTime = getWorldTime()) {
    if (atTime + 0.000001 < nextResidentExpiry) return 0;
    const expired = state.people.filter(person => Number(person.lifeEndsAt) <= atTime + 0.000001);
    if (!expired.length) return 0;
    const expiredIds = new Set(expired.map(person => person.id));
    const groups = normaliseDemographics();
    for (const person of expired) {
      const group = ["child", "adult", "elder"].includes(person.ageGroup) ? person.ageGroup : "adult";
      groups[group] = Math.max(0, groups[group] - 1);
    }
    state.people = state.people.filter(person => !expiredIds.has(person.id));
    const survivingResidents = state.people.length;
    const groupTotal = groups.children + groups.adults + groups.elders;
    if (groupTotal > 0) {
      const scale = survivingResidents / groupTotal;
      groups.children *= scale;
      groups.adults *= scale;
      groups.elders *= scale;
    }
    state.population = survivingResidents;
    rosterDirty = true;
    const travellerDeaths = expired.filter(person => person.origin === "traveller").length;
    state.stats.naturalDeaths = (state.stats.naturalDeaths || 0) + expired.length;
    state.stats.travellerDeaths = (state.stats.travellerDeaths || 0) + travellerDeaths;
    const message = expired.length === 1
      ? `${expired[0].name} reached the end of their life and is remembered by the village.`
      : `${expired.length} residents reached the end of their lives${travellerDeaths ? `, including ${travellerDeaths} travelling settler${travellerDeaths === 1 ? "" : "s"}` : ""}.`;
    addLog(message, true);
    showToast("A life remembered", message, "◌");
    return expired.length;
  }

  function updateDemographics(deltaDays) {
    const coverage = getSchoolCoverage();
    const educationTarget = getSchoolCapacity() > 0 ? 38 + coverage * 60 : 18;
    if (!isVillagerNight()) {
      state.education = clamp(state.education + (educationTarget - state.education) * Math.min(1, deltaDays * 0.045), 0, 100);
    }
    const nextHour = Math.floor((getWorldTime() + deltaDays) * 24);
    if (nextHour !== lastResidentLifecycleHour) {
      syncLifeStagesForState(state, getWorldTime() + deltaDays);
      lastResidentLifecycleHour = nextHour;
    }
  }

  function getProductionRates(staffedProductionActive = !isVillagerNight(), includeDiscreteLoggingForecast = true, includeFoodConsumption = isFoodEatingTime()) {
    syncPeopleRoster();
    const season = getSeason();
    const weather = getWeather();
    const difficulty = getDifficulty();
    const workers = getWorkers();
    const jobs = getJobs();
    const efficiency = jobs ? Math.min(1, workers / jobs) : 1;
    const marketBoost = 1 + Math.min(0.22, getOperationalBuildingUnits("market", state, staffedProductionActive) * 0.055);
    const millBoost = 1 + Math.min(0.55, getOperationalBuildingUnits("windmill", state, staffedProductionActive) * 0.2);
    const pollinatorBoost = 1 + Math.min(0.36, getOperationalBuildingUnits("apiary", state, staffedProductionActive) * 0.06);
    const skillBoost = 0.96 + state.education * 0.0016;
    const clinicProtection = Math.min(0.65, getOperationalBuildingUnits("clinic", state, staffedProductionActive) * 0.2);
    const illnessActive = Number(state.buffs.illnessUntil) > getWorldTime();
    const illnessWorkFactor = illnessActive ? 0.72 + clinicProtection * 0.35 : 1;
    const granaryFactor = getFoodConservationFactor(staffedProductionActive);
    const soilFactor = 0.38 + state.ecosystem.soil * 0.007;
    const forestFactor = 0.28 + state.ecosystem.forest * 0.008;
    const wildlifeFactor = 0.24 + state.ecosystem.wildlife * 0.0085;
    const waterFactor = 0.36 + state.ecosystem.water * 0.007;
    const rationing = state.buffs.rationUntil >= state.day ? 0.7 : 1;
    const blight = state.buffs.blightUntil >= state.day ? 0.62 : 1;
    const winterFuel = season.id === "winter" ? state.population * 0.22 : state.population * 0.045;

    const rates = {
      // Each resident has a stable daily ration based on life stage. Rations are
      // consumed from 04:00 until 20:00, rather than continuously overnight.
      food: includeFoodConsumption
        ? -getDailyFoodNeed() * difficulty.consumption * granaryFactor * 24 / (FOOD_EATING_END_HOUR - FOOD_EATING_START_HOUR)
        : 0,
      water: -state.population * 1.34 * difficulty.consumption * season.waterUse * (weather.waterUse || 1) * rationing,
      wood: -winterFuel * difficulty.consumption,
      stone: 0,
      population: 0,
      health: 0,
      happiness: 0,
      workerEfficiency: staffedProductionActive ? efficiency : 0
    };

    for (const building of state.buildings) {
      const def = BUILDINGS[building.type];
      let active = getBuildingProductionMultiplier(building, state, staffedProductionActive, skillBoost);
      if (illnessActive && def.jobs) active *= illnessWorkFactor;
      if (illnessActive && def.automaticProduction !== undefined) {
        const baseline = Number(def.automaticProduction) || 0;
        active = baseline + (active - baseline) * illnessWorkFactor;
      }
      switch (building.type) {
        case "farm": {
          const cleanCropFactor = getLocalProductionFactor(building);
          rates.food += 25 * active * season.farm * weather.food * soilFactor * millBoost * pollinatorBoost * marketBoost * blight * cleanCropFactor;
          rates.water -= 3.1 * active;
          break;
        }
        case "orchard": {
          const cleanCropFactor = getLocalProductionFactor(building);
          rates.food += 15 * active * (0.58 + season.farm * 0.42) * weather.food * soilFactor * pollinatorBoost * marketBoost * blight * cleanCropFactor;
          rates.water -= 2.2 * active;
          break;
        }
        case "apiary":
          rates.food += 5.5 * active * (0.65 + season.farm * 0.35) * weather.food;
          break;
        case "rain_garden":
          rates.water += 13 * active * weather.waterOutput * waterFactor;
          break;
        case "reservoir":
          rates.water += 20 * active * (0.72 + weather.waterOutput * 0.28) * marketBoost;
          break;
        case "well":
          rates.water += 29 * active * weather.waterOutput * waterFactor * marketBoost;
          break;
        case "river_pump":
          if (!areScenarioWaterwaysDry()) rates.water += 24 * active * marketBoost;
          break;
        case "lumber":
          if (includeDiscreteLoggingForecast) rates.wood += getProjectedLoggingTimberRate(building, state, staffedProductionActive);
          break;
        case "hunter":
          rates.food += 16 * active * wildlifeFactor * marketBoost;
          break;
        case "quarry":
          rates.stone += 31 * active * marketBoost;
          break;
        case "forester":
          rates.wood += 8.5 * active * weather.wood * forestFactor * marketBoost;
          break;
        case "workshop":
          rates.wood += 6.5 * active * marketBoost;
          rates.stone += 5.5 * active * marketBoost;
          break;
        case "clinic":
          rates.health += 1.4 * active;
          break;
        case "park":
          rates.happiness += 0.75 * active;
          break;
        case "market":
          rates.happiness += 0.5 * active;
          break;
        case "school":
          rates.happiness += 0.35 * active * getSchoolCoverage();
          break;
        case "playground": {
          const supported = Math.min(1, getChildSupport() / Math.max(1, state.demographics.children));
          rates.health += 0.22 * active * supported;
          rates.happiness += 0.65 * active * supported;
          break;
        }
      }
    }

    const residentialNoise = getVillageNoiseReport(state, staffedProductionActive);
    rates.happiness -= residentialNoise.moodLoss;
    rates.health -= residentialNoise.healthLoss;

    const housing = getHousing();
    const foodSafe = state.resources.food > state.population * 3;
    const waterSafe = state.resources.water > state.population * 3;
    const hasShortage = state.resources.food <= 0.05 || state.resources.water <= 0.05;

    if (state.resources.food <= 0.05) rates.health -= 11 * (1 - clinicProtection);
    if (state.resources.water <= 0.05) rates.health -= 18 * (1 - clinicProtection);
    if (housing + 0.05 < state.population) rates.health -= 4.5 * (1 - clinicProtection);
    if (ecosystemScore() < 35) rates.health -= (35 - ecosystemScore()) * 0.1;
    if (!hasShortage && state.health < 94) rates.health += 0.45;
    if (illnessActive) {
      rates.health -= 2.8 * (1 - clinicProtection);
      rates.happiness -= 0.85 * (1 - clinicProtection);
    }

    if (state.resources.food <= 0.05) rates.happiness -= 7;
    if (state.resources.water <= 0.05) rates.happiness -= 9;
    if (housing + 0.05 < state.population) rates.happiness -= 5;
    if (ecosystemScore() < 50) rates.happiness -= (50 - ecosystemScore()) * 0.05;
    if (!hasShortage && housing >= state.population && state.happiness < 84) rates.happiness += 0.26;

    if (state.health < 24 || hasShortage) {
      rates.population = -(0.18 + Math.max(0, 28 - state.health) * 0.035 + (hasShortage ? 0.2 : 0));
    } else if (state.population < housing - 0.05 && foodSafe && waterSafe && state.happiness > 42) {
      const hallBoost = getOperationalBuildingUnits("townhall", state, staffedProductionActive) > 0 ? 1.3 : 1;
      const roomFactor = Math.min(1, Math.max(0, housing - state.population) / 4);
      rates.population = (0.68 + state.population * 0.028) * (state.happiness / 100) * (state.health / 100) * difficulty.growth * hallBoost * roomFactor;
    }
    return rates;
  }

  function getDailyAverageProductionRates() {
    // Food is scheduled around meals rather than around the work shift, so add
    // its true 24-hour average after combining staffed and night production.
    const dayRates = getProductionRates(true, true, false);
    const nightRates = getProductionRates(false, true, false);
    const dayFraction = getStaffedShiftDayFraction();
    const nightFraction = 1 - dayFraction;
    const rates = Object.fromEntries(Object.keys(dayRates).map(key => [
      key,
      dayRates[key] * dayFraction + nightRates[key] * nightFraction
    ]));
    rates.food -= getAverageDailyFoodConsumption();
    return rates;
  }

  function getEcoRateReport(staffedProductionActive = !isVillagerNight()) {
    syncPeopleRoster();
    const difficulty = getDifficulty();
    const weather = getWeather();
    const metrics = Object.keys(ECO_LABELS);
    const rates = Object.fromEntries(metrics.map(metric => [metric, 0]));
    const contributors = Object.fromEntries(metrics.map(metric => [metric, []]));
    const add = (metric, amount, source, kind) => {
      if (!(metric in rates) || !Number.isFinite(amount) || Math.abs(amount) < 0.0000001) return;
      rates[metric] += amount;
      contributors[metric].push({ source, amount, kind });
    };

    if (state.ecosystem.forest < 92) add("forest", 0.075 * difficulty.resilience, "Natural forest recovery", "natural");
    if (state.ecosystem.forest > 55) add("wildlife", 0.075 * difficulty.resilience, "Habitat-supported recovery", "natural");
    else add("wildlife", -0.14, "Insufficient forest habitat", "feedback");
    if (state.ecosystem.water < 92) add("water", 0.045 * difficulty.resilience, "Watershed recovery", "natural");
    if (state.ecosystem.soil < 90) add("soil", 0.05 * difficulty.resilience, "Natural soil recovery", "natural");
    if (state.ecosystem.air < 97) add("air", 0.15 * difficulty.resilience, "Natural air clearing", "natural");
    const standingWildTrees = getStandingWildTreeCount();
    const airFilteringTreeGroups = Math.floor(standingWildTrees / 50);
    if (airFilteringTreeGroups) add("air", airFilteringTreeGroups * 0.02, `${standingWildTrees} standing wild trees`, "forest");
    if (state.ecosystem.biodiversity < 91) add("biodiversity", 0.04 * difficulty.resilience, "Natural recolonisation", "natural");
    const schoolReduction = Math.max(0.58, 1 - countBuilding("school") * 0.11);

    add("air", -state.population * 0.0055, "Village population", "demand");
    add("water", -state.population * 0.0038, "Village population", "demand");
    add("biodiversity", -state.population * 0.0018, "Village population", "demand");

    for (const building of state.buildings) {
      const def = BUILDINGS[building.type];
      const staffing = def.jobs ? Math.min(1, getAssignedWorkers(building.id) / def.jobs) : 1;
      let operatingFactor = def.fullStaffProduction
        ? getBuildingProductionMultiplier(building, state, staffedProductionActive, 1)
        : def.jobs
          ? (staffedProductionActive ? 0.35 + staffing * 0.65 : 0)
          : 1;
      if (building.type === "lumber") operatingFactor *= isLoggingStorageBlocked(building) ? 0 : getLoggingAccessFactor(building);
      for (const [metric, amount] of Object.entries(def.dailyEco || {})) {
        const adjusted = amount < 0 ? amount * schoolReduction * operatingFactor : amount * operatingFactor;
        add(metric, adjusted, def.name, amount < 0 ? "building-pressure" : "restoration");
      }
      const forestPollution = getForestPollutionInfo(building);
      add("wildlife", -forestPollution.penalty * operatingFactor, `${def.name} beside forest`, "local-pollution");
    }

    for (const [metric, amount] of Object.entries(weather.eco || {})) add(metric, amount, `${weather.name} weather`, "weather");

    const scenarioCrisis = getScenarioCrisisState();
    if (scenarioCrisis.active) {
      for (const [metric, amount] of Object.entries(scenarioCrisis.pressure)) {
        add(metric, amount, scenarioCrisis.label, "scenario-crisis");
      }
    }

    if (state.ecosystem.forest < 30) {
      add("wildlife", -0.3, "Severe forest-loss feedback", "threshold");
      add("soil", -0.1, "Severe forest-loss feedback", "threshold");
      add("biodiversity", -0.25, "Severe forest-loss feedback", "threshold");
    }
    if (state.ecosystem.water < 30) {
      add("wildlife", -0.18, "Severe water-stress feedback", "threshold");
      add("soil", -0.16, "Severe water-stress feedback", "threshold");
      add("biodiversity", -0.1, "Severe water-stress feedback", "threshold");
    }
    if (state.ecosystem.biodiversity < 25) {
      add("forest", -0.12, "Low-biodiversity feedback", "threshold");
      add("wildlife", -0.2, "Low-biodiversity feedback", "threshold");
    }

    return { rates, contributors };
  }

  function getEcoRates(staffedProductionActive = !isVillagerNight()) {
    return getEcoRateReport(staffedProductionActive).rates;
  }

  function getDailyAverageEcoReport() {
    const dayReport = getEcoRateReport(true);
    const nightReport = getEcoRateReport(false);
    const dayFraction = getStaffedShiftDayFraction();
    const nightFraction = 1 - dayFraction;
    const rates = Object.fromEntries(Object.keys(dayReport.rates).map(metric => [
      metric,
      dayReport.rates[metric] * dayFraction + nightReport.rates[metric] * nightFraction
    ]));
    const contributors = {};
    for (const metric of Object.keys(rates)) {
      const combined = new Map();
      for (const [report, weight] of [[dayReport, dayFraction], [nightReport, nightFraction]]) {
        for (const contributor of report.contributors[metric]) {
          const key = `${contributor.kind}|${contributor.source}`;
          const existing = combined.get(key) || { source: contributor.source, amount: 0, kind: contributor.kind };
          existing.amount += contributor.amount * weight;
          combined.set(key, existing);
        }
      }
      contributors[metric] = [...combined.values()]
        .filter(contributor => Math.abs(contributor.amount) >= 0.0005)
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    }
    return { rates, contributors, day: dayReport, night: nightReport, dayFraction };
  }

  function getDailyAverageEcoRates() {
    return getDailyAverageEcoReport().rates;
  }

  function getDailyAverageEcosystemRate() {
    const rates = Object.values(getDailyAverageEcoRates());
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  }

  function updateSimulation(deltaDays) {
    // Tree and stump timber is stored as each visible job completes. Excluding the
    // forecast here prevents the resource from also being added continuously.
    const rates = getProductionRates(!isVillagerNight(), false);
    for (const resource of ["food", "water", "wood", "stone"]) {
      storeResource(resource, rates[resource] * deltaDays);
    }
    state.health = clamp(state.health + rates.health * deltaDays, 0, 100);
    state.happiness = clamp(state.happiness + rates.happiness * deltaDays, 0, 100);
    applyPopulationChange(rates.population * deltaDays);
    // Materialise a new resident before life-stage totals are recalculated.
    // This call is a no-op on ordinary frames unless the roster is dirty.
    syncPeopleRoster();
    updateDemographics(deltaDays);
    expireResidents(getWorldTime() + deltaDays);
    // Population and life-stage changes are batched once per simulation tick.
    syncPeopleRoster();
    updateLogging(deltaDays);

    const ecoRates = getEcoRates();
    for (const metric of Object.keys(state.ecosystem)) {
      state.ecosystem[metric] = clamp(state.ecosystem[metric] + ecoRates[metric] * deltaDays, 0, 100);
    }

    state.dayProgress += deltaDays;
    while (state.dayProgress >= 1) {
      state.dayProgress -= 1;
      state.day += 1;
      onNewDay();
    }
    updateCityMarketConditions();
    processCityTrades();
    updateWeatherSystem(deltaDays);
    updateDryRiverScenario();
    updateRandomEventSystem();

    trackEcoStats();
    state.stats.maxPopulation = Math.max(state.stats.maxPopulation, state.population);
    updateObjectives();
    checkAchievements();
    checkGameOver();
  }

  function trackEcoStats() {
    const score = ecosystemScore();
    state.stats.minEco = Math.min(state.stats.minEco, score);
    if (score < 40) state.stats.dippedBelow40 = true;
  }

  function onNewDay() {
    const score = ecosystemScore();
    state.stats.ecoDailyChange = score - state.stats.lastDayEco;
    state.stats.lastDayEco = score;
    const oldSeason = getSeason(state.day - 1);
    const newSeason = getSeason(state.day);
    if (oldSeason.id !== newSeason.id) {
      addLog(`${newSeason.name} arrives. Production and village needs have changed.`, true);
      showToast(`${newSeason.name} has begun`, seasonAdvice(newSeason.id), newSeason.icon);
    }

    saveGame();
  }

  function eventGapFromRoll(roll, difficultyId = state?.difficulty || "balanced", survivedDays = state?.day || 1) {
    const difficultyGap = DIFFICULTIES[difficultyId]?.eventGap || 1;
    const survivalPressure = 1 + Math.min(0.8, Math.max(0, Number(survivedDays) || 1) / 180);
    const exponent = survivalPressure / Math.max(0.25, difficultyGap);
    const weightedRoll = Math.pow(clamp(Number(roll) || 0, 0, 1), exponent);
    return EVENT_MIN_GAP_DAYS + (EVENT_MAX_GAP_DAYS - EVENT_MIN_GAP_DAYS) * weightedRoll;
  }

  function scheduleNextRandomEvent() {
    const gap = eventGapFromRoll(rand(), state.difficulty, state.day);
    state.nextEventDay = getWorldTime() + gap;
    return gap;
  }

  function updateRandomEventSystem() {
    if (!gameActive || state.gameOver || !dom.modalLayer) return;
    if (!Number.isFinite(Number(state.nextEventDay))) scheduleNextRandomEvent();
    if (getWorldTime() + 0.000001 < state.nextEventDay || dom.modalLayer.children.length) return;
    scheduleNextRandomEvent();
    window.setTimeout(triggerRandomEvent, 0);
  }

  function seasonAdvice(seasonId) {
    if (seasonId === "summer") return "Farm output rises, but water use increases.";
    if (seasonId === "autumn") return "A good moment to fill stores before winter.";
    if (seasonId === "winter") return "Farms slow, homes burn more timber, and waterways freeze; bridges remain the safe crossings.";
    return "Rain and warmth make this the best season for recovery.";
  }

  function chooseWeatherId() {
    const season = getSeason();
    const table = WEATHER_TABLES[season.id];
    const alternatives = table.filter(weatherId => weatherId !== state.weather);
    let weatherId = (alternatives.length ? alternatives : table)[Math.floor(rand() * (alternatives.length || table.length))];
    if (state.difficulty === "gentle" && WEATHERS[weatherId].severe && rand() < 0.55) weatherId = "mild";
    if (state.difficulty === "harsh" && !WEATHERS[weatherId].severe && rand() < 0.18) {
      const severeBySeason = { spring: "storm", summer: "drought", autumn: "storm", winter: "blizzard" };
      weatherId = severeBySeason[season.id];
    }
    if (weatherId === state.weather) weatherId = alternatives[0] || weatherId;
    return weatherId;
  }

  function scheduleNextWeatherChange(weatherId = state.weather) {
    state.weatherStartedAt = getWorldTime();
    state.weatherDurationDays = weatherDurationFromRoll(weatherId, rand());
    state.nextWeatherChange = state.weatherStartedAt + state.weatherDurationDays;
  }

  function beginWeatherTransition(weatherId) {
    if (!WEATHERS[weatherId] || weatherId === state.weather) {
      scheduleNextWeatherChange(state.weather);
      return;
    }
    state.weatherFrom = state.weather;
    state.weather = weatherId;
    state.weatherBlend = 0;
    scheduleNextWeatherChange(weatherId);
    const incoming = WEATHERS[weatherId];
    const durationText = formatWeatherDuration(state.weatherDurationDays).replace(" left", "");
    if (incoming.severe) addLog(`${incoming.name} is moving across the clearing and may last about ${durationText}.`, true);
    showToast("Weather shifting", `${incoming.name} is moving in for about ${durationText}.`, incoming.icon);
  }

  function updateWeatherSystem(deltaDays) {
    if (state.weatherBlend < 1) {
      state.weatherBlend = clamp(state.weatherBlend + deltaDays / getWeatherFadeDuration(), 0, 1);
      if (state.weatherBlend >= 1) state.weatherFrom = state.weather;
    }
    if (!Number.isFinite(Number(state.nextWeatherChange))) scheduleNextWeatherChange(state.weather);
    if (getWorldTime() >= state.nextWeatherChange && state.weatherBlend >= 1) beginWeatherTransition(chooseWeatherId());
  }

  function updateDryRiverScenario() {
    const scenario = getActiveScenario();
    if (scenario?.id !== "dry_river" || state.dryRiverRefilled === true || getWorldTime() < scenario.dryRiverRefillAt) return;
    if (state.dryRiverStormStartedAt === null || !Number.isFinite(Number(state.dryRiverStormStartedAt))) {
      state.dryRiverStormStartedAt = getWorldTime();
      state.weather = "storm";
      state.weatherFrom = "storm";
      state.weatherBlend = 1;
      state.weatherStartedAt = state.dryRiverStormStartedAt;
      state.weatherDurationDays = 1;
      state.nextWeatherChange = state.weatherStartedAt + state.weatherDurationDays;
      addLog("A massive autumn thunderstorm has struck the upper catchment. The dry channels are still waiting for the runoff to arrive.", true);
      showToast("Thunderstorm upstream", "Runoff will reach the dry river and creeks in one in-game hour.", "ϟ");
      return;
    }
    if (getWorldTime() - state.dryRiverStormStartedAt < DRY_RIVER_GUSH_DELAY_DAYS) return;
    state.dryRiverRefilled = true;
    state.dryRiverGushStartedAt = getWorldTime();
    storeResource("water", 60);
    applyEcoEffect({ water: 7, soil: 1.4, wildlife: 0.8, biodiversity: 0.7 });
    addLog("Runoff is gushing in from upstream, refilling the Dry River and creeks. The channel is flowing again, but the storm tests every exposed bank.", true);
    showToast("Runoff arrives", "Water is gushing downstream and has restored 60 stored water.", "ϟ");
  }

  function addLog(text, important = false) {
    state.logs.unshift({ day: state.day, text, important });
    state.logs = state.logs.slice(0, 100);
  }

  function getActiveScenario() {
    return SCENARIOS.find(scenario => scenario.id === state?.scenarioId) || null;
  }

  function getScenarioCrisisState(scenario = getActiveScenario()) {
    if (!scenario?.crisisPressure) return { active: false, resolved: false, label: "", pressure: {} };
    const resolved = Boolean(state.scenarioCompleted || scenario.crisisResolved?.());
    return {
      active: !resolved,
      resolved,
      label: scenario.crisisLabel || "Ongoing environmental crisis",
      pressure: scenario.crisisPressure
    };
  }

  function updateObjectives() {
    const scenario = getActiveScenario();
    if (scenario) {
      if (state.scenarioCompleted || !scenario.goals.every(goal => goal.test())) return;
      state.scenarioCompleted = true;
      addResources(scenario.reward);
      addLog(`Completed the “${scenario.name}” scenario. The village earned a resilience cache.`, true);
      showToast("Scenario completed", `${scenario.name} — resilience supplies added to storage.`, scenario.icon);
      saveGame();
      return;
    }
    normaliseObjectiveProgress(state);
    const chapter = OBJECTIVE_CHAPTERS[state.objectiveChapter];
    if (!chapter || state.completedObjectives.includes(state.objectiveChapter)) return;
    if (!chapter.goals.every(goal => goal.test())) return;

    const completedIndex = state.objectiveChapter;
    state.completedObjectives.push(completedIndex);
    addResources(chapter.reward);
    if (completedIndex === 0) state.stats.stewardComplete = true;
    addLog(`Completed “${chapter.title}” and received the Steward’s reward.`, true);
    showToast("Path completed", `${chapter.title} — supplies added to storage.`, "✓");
    state.objectiveChapter = Math.min(OBJECTIVE_CHAPTERS.length - 1, state.objectiveChapter + 1);
    saveGame();
  }

  function checkGameOver() {
    if (state.gameOver) return;
    const collapse = getEcosystemCollapse();
    if (collapse?.type === "indicator") {
      const label = ECO_LABELS[collapse.metric];
      endGame("ecosystem", `${label} reached 0%. One essential part of the living system has failed, so the settlement cannot continue.`, { failedMetric: collapse.metric });
    } else if (collapse?.type === "overall") {
      endGame("ecosystem", `The overall ecosystem fell below ${ECOSYSTEM_COLLAPSE_THRESHOLD}%. The living web can no longer support the settlement.`);
    } else if (state.population < 0.95) {
      endGame("village", "The last villagers have left the clearing. The forest remains, but this settlement’s story has ended.");
    }
  }

  function endGame(reason, description, details = {}) {
    state.gameOver = { reason, day: state.day, eco: ecosystemScore(), population: state.population, ...details };
    state.paused = true;
    addLog(reason === "ecosystem" ? "The ecosystem collapsed." : "The village was abandoned.", true);
    checkAchievements(true);
    saveGame();
    showGameOver(description);
  }

  function checkAchievements(onGameOver = false) {
    if (!state || state.gameOver && !onGameOver) return;
    const eco = ecosystemScore();
    const conditions = {
      first_roots: state.stats.stewardComplete,
      growing_pains: state.population >= 25,
      wild_refuge: countBuilding("sanctuary") >= 3,
      full_circle: state.day >= 49,
      balanced_harvest: state.day >= 31 && state.stats.minEco >= 70,
      rewilder: state.stats.dippedBelow40 && eco >= 80,
      mini_city: state.population >= 75 && countBuilding("townhall") >= 1 && eco >= 70,
      bright_future: state.demographics.children >= 1 && getSchoolCapacity() >= state.demographics.children && state.education >= 70,
      century: state.day >= 100,
      perfect_balance: qualifiesForPerfectBalance(),
      careless: onGameOver && state.day < 50,
      environmentalist: onGameOver && state.gameOver?.reason === "village" && eco >= 85
    };
    for (const [id, met] of Object.entries(conditions)) if (met) unlockAchievement(id);
  }

  function unlockAchievement(id) {
    if (achievements[id]) return;
    const def = ACHIEVEMENTS.find(item => item.id === id);
    if (!def) return;
    achievements[id] = { unlockedAt: new Date().toISOString(), village: state.villageName, day: state.day };
    saveAchievements();
    showToast(`Achievement: ${def.name}`, def.description, def.icon);
  }

  function saveAchievements() {
    try {
      localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(achievements));
    } catch (error) {
      console.warn("Achievements could not be saved.", error);
    }
  }

  function loadAchievements() {
    try {
      achievements = JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY) || "{}") || {};
    } catch {
      achievements = {};
    }
  }

  function normaliseSaveSlot(slot) {
    return clamp(Math.floor(Number(slot) || 1), 1, MAX_SAVE_SLOTS);
  }

  function getSaveSlotKey(slot = activeSaveSlot) {
    return `${SAVE_SLOT_PREFIX}${normaliseSaveSlot(slot)}`;
  }

  function saveGame() {
    if (!state || !gameActive) return;
    try {
      captureLearningProgress();
      const serialised = JSON.stringify(state);
      localStorage.setItem(getSaveSlotKey(), serialised);
      // Keep the original key as a Slot 1 mirror so existing local villages,
      // exports, and older builds remain compatible.
      if (activeSaveSlot === 1) localStorage.setItem(SAVE_KEY, serialised);
      if (dom.autosaveStatus) {
        dom.autosaveStatus.textContent = `Slot ${activeSaveSlot} saved just now`;
        window.setTimeout(() => {
          if (dom.autosaveStatus) dom.autosaveStatus.textContent = `Slot ${activeSaveSlot} saved locally`;
        }, 1400);
      }
    } catch (error) {
      showToast("Save unavailable", "This browser did not allow local saving.", "!");
      console.warn(error);
    }
  }

  function readSavedGame(slot = activeSaveSlot) {
    try {
      const selectedSlot = normaliseSaveSlot(slot);
      const raw = localStorage.getItem(getSaveSlotKey(selectedSlot))
        || (selectedSlot === 1 ? localStorage.getItem(SAVE_KEY) : null);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function exportSaveFile() {
    if (!state || !gameActive) return;
    saveGame();
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (state.villageName || "wildroot-village").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "wildroot-village";
    link.href = url;
    link.download = `${safeName}-save.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("Save exported", "Keep the JSON file somewhere safe to restore this village later.", "⇩");
  }

  function importSaveFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Import rejected", "Choose a Wildroot save smaller than 5 MB.", "!");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showToast("Import failed", "The selected file could not be read.", "!");
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || ""));
        const compatible = (imported?.version === SAVE_VERSION && Array.isArray(imported.buildings))
          || (imported?.version === 1 && Array.isArray(imported.tiles));
        if (!compatible) throw new Error("Not a compatible Wildroot save.");
        if (!window.confirm(`Replace Slot ${activeSaveSlot}'s current village with “${imported.villageName || "this imported village"}”?`)) return;
        state = normaliseLoadedState(imported);
        state.paused = true;
        gameActive = true;
        selectedBuilding = null;
        activeTool = "inspect";
        villagers.splice(0, villagers.length);
        villagerSignature = "";
        dom.modalLayer.innerHTML = "";
        modalClosable = false;
        saveGame();
        renderAll();
        showToast("Village imported", `${state.villageName} is ready to review before you resume time.`, "⇧");
      } catch (error) {
        console.warn("Save import failed.", error);
        showToast("Import rejected", "Choose a valid Wildroot JSON save file.", "!");
      }
    };
    reader.readAsText(file);
  }

  function showToast(title, message, icon = "✦") {
    if (!dom.toastStack) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span class="toast-icon">${escapeHtml(icon)}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
    dom.toastStack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4600);
  }

  const EVENT_LEARNING_LENSES = {
    deer: "Renewable harvest depends on breeding populations and habitat. A short-term food gain can reduce the future population that would replace it.",
    migrants: "Carrying capacity is about fair access to housing, food, water, services and environmental limits—not simply the number of people present.",
    dry_wells: "Groundwater is a shared, slowly renewed resource. Taking deep reserves now can transfer scarcity and ecological cost into the future.",
    merchant: "Trade can improve resilience, but it can also move environmental pressure beyond the visible map. Ask where imported and exported materials came from.",
    poachers: "Shared wildlife needs rules, monitoring and cooperation. Without them, individual short-term gain can deplete a resource everyone depends on.",
    field_blight: "Diverse crops, healthy soil and early detection often reduce disease risk. Resilience means avoiding dependence on one vulnerable harvest.",
    sacred_grove: "Old forests contain structures, species and genetic history that young plantings cannot replace quickly, even when both are counted as trees.",
    wildfire: "Fire is a natural process in many ecosystems, but drought, fuel patterns and settlement design change its risk. Prevention and recovery both matter.",
    flood: "Floodplains and wetlands can safely store water. Confining every flood may protect one place while increasing flow and erosion somewhere else.",
    village_illness: "One Health links human, animal and ecosystem health. Clean water, uncrowded care and prevention can matter as much as treatment after spread.",
    pollinator_decline: "Pollination is an ecosystem service: wild organisms perform work that food production depends on, even when it is not counted as a stored item.",
    invasive_vines: "Invasive-species control involves trade-offs. Targeted early action can protect native life and avoid broad chemical harm to water and soil.",
    fallen_old_tree: "Deadwood is not ecological waste. It stores moisture, returns nutrients and provides food and shelter for fungi, insects, birds and seedlings.",
    factory_offer: "Pollution and extraction create external costs that may be excluded from a price. Ask who receives the benefit and who carries the health and environmental harm.",
    winter_refuge: "Seasonal scarcity affects the whole food web. Resilience can require sharing limited resources while still protecting essential human needs."
  };

  const EVENTS = [
    {
      id: "deer",
      icon: "♧",
      title: "Deer in the clearing",
      description: "A small deer herd has begun feeding beside the settlement. Hungry families watch from the path while the animals test the village’s boundaries.",
      eligible: () => state.day >= 3,
      choices: [
        {
          label: "Guard the herd",
          detail: "Share winter stores and keep hunters away. Wildlife and biodiversity recover.",
          cost: { food: 15 },
          effect: severity => {
            applyEcoEffect({ wildlife: 4.5, biodiversity: 1.8 }, 1 / Math.max(1, severity * 0.5));
            state.happiness = clamp(state.happiness + 2, 0, 100);
          },
          result: "The village marked the meadow as safe passage for deer."
        },
        {
          label: "Organise a hunt",
          detail: "Gain a large food supply, but remove breeding animals from the forest.",
          effect: severity => {
            state.resources.food += 42;
            applyEcoEffect({ wildlife: -6.2, biodiversity: -2.1 }, severity);
            state.stats.animalsHunted += 1;
          },
          result: "The hunt filled the smokehouses, and the forest grew quieter."
        }
      ]
    },
    {
      id: "migrants",
      icon: "↟",
      title: "Families at the forest road",
      description: "Several travelling families ask to join the settlement. They bring willing hands, but your stores and land will carry the added weight.",
      eligible: () => state.day >= 5,
      choices: [
        {
          label: "Welcome four settlers",
          detail: "Population grows immediately. Each traveller will live 20–40 days after settling. Requires spare housing and a welcome feast.",
          cost: { food: 22 },
          available: () => getHousing() >= state.population + 4,
          unavailableText: "Requires room for 4",
          effect: () => {
            applyPopulationChange(4, { children: 1, adults: 3, elders: 0 }, { origin: "traveller" });
            state.happiness = clamp(state.happiness + 4, 0, 100);
          },
          result: "Four new neighbours were welcomed around the founders’ hearth."
        },
        {
          label: "Offer supplies for the road",
          detail: "Remain small while helping the families find another safe settlement.",
          cost: { food: 10 },
          effect: () => {
            state.happiness = clamp(state.happiness + 1, 0, 100);
            applyEcoEffect({ biodiversity: 0.4 });
          },
          result: "The travellers departed with full packs and warm farewells."
        }
      ]
    },
    {
      id: "dry_wells",
      icon: "≈",
      title: "The water table falls",
      description: "Well ropes return damp instead of dripping. The village can ration what remains or dig into the ancient aquifer beneath the forest.",
      eligible: () => state.day >= 10 && (getSeason().id === "summer" || state.ecosystem.water < 70 || getWeather().id === "drought"),
      choices: [
        {
          label: "Begin strict rationing",
          detail: "Use 30% less water for four days, at the cost of village happiness.",
          effect: () => {
            state.buffs.rationUntil = state.day + 4;
            state.happiness = clamp(state.happiness - 7, 0, 100);
          },
          result: "Water rations were measured out from dawn to dusk."
        },
        {
          label: "Tap the deep aquifer",
          detail: "Gain 70 water now, but permanently wound water quality and soil life.",
          effect: severity => {
            state.resources.water += 70;
            applyEcoEffect({ water: -8, soil: -2.5, biodiversity: -1.2 }, severity);
          },
          result: "Deep water filled the cisterns, carrying pale sediment with it."
        }
      ]
    },
    {
      id: "merchant",
      icon: "◇",
      title: "A travelling grain merchant",
      description: "A wagon from the lowlands offers sacks of grain in exchange for good Wildroot timber. The price is high, but the grain would soften future shortages.",
      eligible: () => state.day >= 6,
      choices: [
        {
          label: "Trade timber for grain",
          detail: "Exchange 30 timber for 75 food.",
          cost: { wood: 30 },
          effect: () => { state.resources.food += 75; },
          result: "The merchant left with timber, and the granary shelves filled."
        },
        {
          label: "Keep local materials",
          detail: "Make no trade and preserve resources for construction.",
          effect: () => { state.happiness = clamp(state.happiness - 1, 0, 100); },
          result: "The wagon continued down the forest road."
        }
      ]
    },
    {
      id: "poachers",
      icon: "⌁",
      title: "Snares beyond the boundary",
      description: "Foresters discover unmarked snares throughout the old woods. The poachers offer meat in return for silence when they are confronted.",
      eligible: () => state.day >= 12,
      choices: [
        {
          label: "Patrol the forest",
          detail: "Feed the patrol and dismantle the snares. Wildlife begins to recover.",
          cost: { food: 18 },
          effect: () => {
            applyEcoEffect({ wildlife: 4, biodiversity: 1.4 });
            state.happiness = clamp(state.happiness + 2, 0, 100);
          },
          result: "The last snare was removed before sunset."
        },
        {
          label: "Accept their bargain",
          detail: "Gain 45 food while the poachers thin the animal population.",
          effect: severity => {
            state.resources.food += 45;
            applyEcoEffect({ wildlife: -7, biodiversity: -2.4 }, severity);
            state.stats.animalsHunted += 1;
          },
          result: "Fresh meat arrived, though birdsong faded beyond the boundary."
        }
      ]
    },
    {
      id: "field_blight",
      icon: "!",
      title: "Blight among the fields",
      description: "Dark spots spread across the crops after sunrise. Burning the affected harvest may protect the soil; ignoring it risks a longer, deeper shortage.",
      eligible: () => state.day >= 14 && countBuilding("farm") > 0,
      choices: [
        {
          label: "Burn affected crops",
          detail: "Lose 35 food now and slightly harm the soil, but end the outbreak.",
          cost: { food: 35 },
          effect: severity => applyEcoEffect({ air: -0.8, soil: -0.7 }, severity),
          result: "The blackened rows were isolated before the blight could spread."
        },
        {
          label: "Risk the remaining harvest",
          detail: "Farms produce 38% less for five days, preserving today’s stores.",
          effect: () => {
            state.buffs.blightUntil = state.day + 5;
            state.happiness = clamp(state.happiness - 3, 0, 100);
          },
          result: "The village waited anxiously as the blight moved between rows."
        }
      ]
    },
    {
      id: "sacred_grove",
      icon: "✦",
      title: "The hidden grove",
      description: "Children find a ring of ancient trees beyond the northern ridge, untouched by axe or fire. It could become a protected seed bank—or valuable timber.",
      eligible: () => state.day >= 16,
      choices: [
        {
          label: "Protect the grove",
          detail: "Gain no materials. Forest, wildlife and biodiversity recover strongly.",
          effect: () => {
            applyEcoEffect({ forest: 4.5, wildlife: 3, soil: 1.5, biodiversity: 5 });
            state.happiness = clamp(state.happiness + 3, 0, 100);
          },
          result: "The ancient grove was marked on every village map as protected land."
        },
        {
          label: "Harvest the old trees",
          detail: "Gain 75 timber, with major damage to forest structure and biodiversity.",
          effect: severity => {
            state.resources.wood += 75;
            applyEcoEffect({ forest: -9, wildlife: -3, soil: -2, biodiversity: -7 }, severity);
          },
          result: "Great trunks reached the sawyard; the grove would take generations to return."
        }
      ]
    },
    {
      id: "wildfire",
      icon: "ϟ",
      title: "Fire at the forest edge",
      description: "A dry lightning strike sends flame through the undergrowth. There is little time to choose between a costly water brigade and a wide cut firebreak.",
      eligible: () => state.day >= 22 && (getSeason().id === "summer" || getWeather().id === "storm" || getWeather().id === "drought"),
      choices: [
        {
          label: "Form a water brigade",
          detail: "Spend 55 water and 18 food. The forest suffers only limited damage.",
          cost: { water: 55, food: 18 },
          effect: severity => applyEcoEffect({ forest: -2.5, wildlife: -1.2, air: -2, biodiversity: -1.5 }, severity),
          result: "A ring of villagers held the flames until the rain returned."
        },
        {
          label: "Cut a firebreak",
          detail: "Gain 20 timber, but clear a broad habitat corridor to stop the fire.",
          effect: severity => {
            state.resources.wood += 20;
            applyEcoEffect({ forest: -10, wildlife: -4, soil: -3, air: -3, biodiversity: -5 }, severity);
          },
          result: "The fire stopped at raw earth, leaving a broad scar across the forest."
        }
      ]
    },
    {
      id: "flood",
      icon: "≈",
      title: "Floodwater from the hills",
      description: "Days of rain send brown water racing toward the clearing. Barriers can save stores, while opening the lower meadow would let the flood spread naturally.",
      eligible: () => state.day >= 18 && (getWeather().id === "rain" || getWeather().id === "storm"),
      choices: [
        {
          label: "Build timber barriers",
          detail: "Spend 35 timber to protect village stores, disturbing the stream bank.",
          cost: { wood: 35 },
          effect: severity => applyEcoEffect({ water: -1.5, soil: -1 }, severity),
          result: "The barriers held, though muddy banks collapsed downstream."
        },
        {
          label: "Flood the meadow",
          detail: "Lose 30 food, but replenish water, soil and wetland habitat.",
          cost: { food: 30 },
          effect: () => applyEcoEffect({ water: 4.5, soil: 2.5, wildlife: 1.5, biodiversity: 2.2 }),
          result: "The meadow became a temporary lake alive with frogs and waterbirds."
        }
      ]
    },
    {
      id: "village_illness",
      icon: "+",
      title: "Illness moves through the village",
      description: "A fever is passing from household to household. Crowded paths and shared water speed its spread, while rest, clean water and local care can shorten the outbreak.",
      eligible: () => state.day >= 8 && state.population >= 8,
      choices: [
        {
          label: "Rest and isolate households",
          detail: "Spend 24 food and 18 water. The outbreak lasts about 1.5 days, with a small morale cost.",
          cost: { food: 24, water: 18 },
          effect: () => {
            state.buffs.illnessUntil = Math.max(Number(state.buffs.illnessUntil) || 0, getWorldTime() + 1.5);
            state.health = clamp(state.health - 1, 0, 100);
            state.happiness = clamp(state.happiness - 2, 0, 100);
          },
          result: "Families rested apart while neighbours left clean meals and water at their doors."
        },
        {
          label: "Keep every workplace open",
          detail: "Spend nothing now. Illness reduces health, morale and staffed output for about four days.",
          effect: () => {
            state.buffs.illnessUntil = Math.max(Number(state.buffs.illnessUntil) || 0, getWorldTime() + 4);
            state.health = clamp(state.health - 3, 0, 100);
          },
          result: "Work continued, but the fever travelled with workers between homes and workplaces."
        },
        {
          label: "Coordinate care through the Clinic",
          detail: "Spend 12 food and 10 water. A staffed Clinic contains the outbreak within about 18 hours.",
          cost: { food: 12, water: 10 },
          available: () => countBuilding("clinic") > 0,
          unavailableText: "Requires a Village Clinic",
          effect: () => {
            state.buffs.illnessUntil = Math.max(Number(state.buffs.illnessUntil) || 0, getWorldTime() + 0.75);
            state.health = clamp(state.health + 1.5, 0, 100);
          },
          result: "Clinic workers traced contacts, protected clean water and contained the fever quickly."
        }
      ]
    },
    {
      id: "pollinator_decline",
      icon: "✿",
      title: "Fewer pollinators in the fields",
      description: "Farmers notice quiet blossoms and poorly formed fruit. Habitat loss has reduced the insects that move pollen between flowers.",
      eligible: () => state.day >= 10 && (countBuilding("farm") > 0 || countBuilding("orchard") > 0),
      choices: [
        {
          label: "Plant native flower strips",
          detail: "Spend 16 food and 10 timber to rebuild connected pollinator habitat.",
          cost: { food: 16, wood: 10 },
          effect: () => applyEcoEffect({ wildlife: 2.2, soil: 0.8, biodiversity: 3.8 }),
          result: "Native flowers linked field edges to the forest, and insects began returning."
        },
        {
          label: "Use a broad pesticide",
          detail: "Gain 32 food now, but harm wildlife, soil life and biodiversity.",
          effect: severity => {
            storeResource("food", 32);
            applyEcoEffect({ wildlife: -3.5, soil: -2, water: -1.2, biodiversity: -4.5 }, severity);
          },
          result: "The immediate harvest improved, but the fields became quieter still."
        }
      ]
    },
    {
      id: "invasive_vines",
      icon: "⌘",
      title: "Vines spread along the forest edge",
      description: "A fast-growing introduced vine is smothering young native trees. Early control is slower than spraying, but protects the soil and stream below.",
      eligible: () => state.day >= 12,
      choices: [
        {
          label: "Remove vines by hand",
          detail: "Spend 20 food on a careful work crew. Forest structure and biodiversity recover.",
          cost: { food: 20 },
          effect: () => applyEcoEffect({ forest: 2.8, wildlife: 1.2, biodiversity: 2.6 }),
          result: "Crews removed roots and replanted native ground cover before seeds could spread."
        },
        {
          label: "Spray the whole edge",
          detail: "Control the vines cheaply, but chemicals enter soil and runoff.",
          effect: severity => applyEcoEffect({ forest: 0.8, soil: -2.5, water: -2.2, wildlife: -1.4, biodiversity: -2 }, severity),
          result: "The vines wilted quickly, followed by many plants that had sheltered beneath them."
        }
      ]
    },
    {
      id: "fallen_old_tree",
      icon: "♧",
      title: "An old tree falls",
      description: "A great tree has fallen naturally near the clearing. Its trunk can become timber, or remain as deadwood habitat that returns nutrients to the forest.",
      eligible: () => state.day >= 6,
      choices: [
        {
          label: "Leave it as habitat",
          detail: "Gain no timber. Fungi, insects and sheltering animals enrich the food web.",
          effect: () => applyEcoEffect({ forest: 1.2, wildlife: 2.1, soil: 1.5, biodiversity: 2.4 }),
          result: "The fallen trunk became a nursery for moss, fungi, beetles and seedlings."
        },
        {
          label: "Salvage the trunk",
          detail: "Gain 28 timber with a small loss of habitat and nutrient recycling.",
          effect: severity => {
            storeResource("wood", 28);
            applyEcoEffect({ forest: -0.8, wildlife: -1.3, soil: -0.7, biodiversity: -1.1 }, severity);
          },
          result: "Useful boards reached storage, while the forest lost a pocket of deadwood habitat."
        }
      ]
    },
    {
      id: "factory_offer",
      icon: "⚒",
      title: "The foundry proposal",
      description: "Outside investors offer tools and building material for permission to cut coal and ore beyond the clearing. Their papers promise prosperity, not restoration.",
      eligible: () => state.day >= 30 && state.population >= 20,
      choices: [
        {
          label: "Sign the extraction charter",
          detail: "Gain 100 timber and 85 stone. Air, water, soil and biodiversity suffer.",
          effect: severity => {
            state.resources.wood += 100;
            state.resources.stone += 85;
            state.happiness = clamp(state.happiness + 5, 0, 100);
            applyEcoEffect({ forest: -6, water: -7, soil: -6, air: -8, biodiversity: -5 }, severity);
          },
          result: "Heavy carts arrived, and a grey veil settled between the trees."
        },
        {
          label: "Refuse the foundry",
          detail: "Receive nothing. The protected watershed and forest remain intact.",
          effect: () => {
            state.happiness = clamp(state.happiness - 2, 0, 100);
            applyEcoEffect({ water: 1.4, air: 1.4, biodiversity: 1 });
          },
          result: "The investors left. The village chose slower growth on its own terms."
        }
      ]
    },
    {
      id: "winter_refuge",
      icon: "❄",
      title: "Animals at the storehouse",
      description: "A deep freeze drives birds and small animals toward village grain. Sharing stores may help the forest survive winter; driving them away protects every ration.",
      eligible: () => state.day >= 20 && getSeason().id === "winter",
      choices: [
        {
          label: "Leave winter feed",
          detail: "Spend 28 food to protect wildlife through the freeze.",
          cost: { food: 28 },
          effect: () => applyEcoEffect({ wildlife: 4, biodiversity: 2 }),
          result: "Seed trays and sheltered corners carried many small lives through winter."
        },
        {
          label: "Protect the granary",
          detail: "Keep all food, but wildlife and village happiness decline.",
          effect: severity => {
            state.happiness = clamp(state.happiness - 3, 0, 100);
            applyEcoEffect({ wildlife: -3.5, biodiversity: -1.3 }, severity);
          },
          result: "The granary remained full while tracks vanished from the snow."
        }
      ]
    }
  ];

  function triggerRandomEvent() {
    if (!gameActive || state.gameOver || !dom.modalLayer || dom.modalLayer.children.length) return;
    let eligible = EVENTS.filter(event => (!event.eligible || event.eligible()) && event.id !== state.lastEventId);
    if (!eligible.length) eligible = EVENTS.filter(event => !event.eligible || event.eligible());
    if (!eligible.length) return;
    const event = eligible[Math.floor(rand() * eligible.length)];
    showEvent(event);
  }

  function showEvent(event) {
    pauseForModal(false);
    modalClosable = false;
    const severity = getDifficulty().eventSeverity * (1 + Math.min(0.55, state.day / 180));
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="event-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="eventTitle">
          <span class="eyebrow">DAY ${state.day} · A CHOICE FOR THE STEWARD</span>
          <div class="modal-icon" aria-hidden="true">${escapeHtml(event.icon)}</div>
          <h2 id="eventTitle">${escapeHtml(event.title)}</h2>
          <p class="modal-description">${escapeHtml(event.description)}</p>
          <div class="event-learning-lens" data-event-learning-lens><strong>Learning lens</strong><span>${escapeHtml(EVENT_LEARNING_LENSES[event.id] || "Compare the immediate benefit, delayed effects, who carries the cost and whether the ecosystem can recover.")}</span></div>
          <div class="event-choices">
            ${event.choices.map((choice, index) => {
              const affordable = canAfford(choice.cost || {});
              const available = choice.available ? choice.available() : true;
              const costText = !available
                ? choice.unavailableText
                : Object.entries(choice.cost || {}).map(([key, amount]) => `${amount} ${key}`).join(" · ");
              return `<button class="choice-button" data-choice="${index}" type="button" ${affordable && available ? "" : "disabled"}>
                <span>${escapeHtml(choice.label)}</span>
                <span class="choice-cost">${escapeHtml(costText || "No immediate cost")}</span>
                <small>${escapeHtml(choice.detail)}</small>
              </button>`;
            }).join("")}
          </div>
        </section>
      </div>`;

    dom.modalLayer.querySelectorAll("[data-choice]").forEach(button => {
      button.addEventListener("click", () => {
        const choice = event.choices[Number(button.dataset.choice)];
        if (!choice || !canAfford(choice.cost || {}) || (choice.available && !choice.available())) return;
        payCost(choice.cost || {});
        choice.effect(severity);
        clampResourcesToStorage();
        state.lastEventId = event.id;
        state.stats.eventsFaced += 1;
        addLog(choice.result, true);
        closeModal(true);
        showToast(event.title, choice.result, event.icon);
        checkAchievements();
        saveGame();
      });
    });
  }

  function selectBuilding(type) {
    const def = BUILDINGS[type];
    if (!def || !buildingUnlocked(def)) return;
    if (selectedBuilding !== type) selectedRotation = 0;
    selectedBuilding = type;
    activeTool = "build";
    updateSelectionUi();
    keepMapResponsive();
  }

  function setTool(tool) {
    selectedBuilding = null;
    selectedRotation = 0;
    activeTool = tool;
    updateSelectionUi();
    keepMapResponsive();
  }

  function rotateSelectedBuilding(direction) {
    if (!selectedBuilding) {
      showMapMessage("Select a building before rotating it.");
      return;
    }
    selectedRotation = normaliseRotation(selectedRotation + direction);
    const size = getBuildingSize(selectedBuilding, selectedRotation);
    updateSelectionUi();
    showMapMessage(`Rotated ${direction < 0 ? "left" : "right"} · ${size.w} × ${size.h}`);
    keepMapResponsive();
  }

  function getPlacementOrigin(type, cursorX, cursorY, rotation = selectedRotation) {
    const size = getBuildingSize(type, rotation);
    return { x: cursorX - Math.floor(size.w / 2), y: cursorY - Math.floor(size.h / 2) };
  }

  function getPlacementStatus(type, originX, originY, rotation = selectedRotation) {
    const bridgeStatus = getBridgePlacementStatusForState(state, type, originX, originY, rotation);
    if (bridgeStatus) return bridgeStatus;
    const size = getBuildingSize(type, rotation);
    for (let dy = 0; dy < size.h; dy++) {
      for (let dx = 0; dx < size.w; dx++) {
        const x = originX + dx;
        const y = originY + dy;
        if (!inWorld(x, y)) return { valid: false, reason: "That footprint reaches beyond the 100 × 100 world." };
        if (!isClearing(x, y)) return { valid: false, reason: "Every footprint tile must stay inside the clearing." };
        if (state.occupancy[tileIndex(x, y)]) return { valid: false, reason: "That footprint overlaps another building." };
      }
    }
    if (BUILDINGS[type]?.waterIntake && !touchesWaterwayForState(state, originX, originY, size)) {
      return { valid: false, reason: "The River Pump must sit on cleared land beside a creek or river." };
    }
    if (BUILDINGS[type]?.requiresAdjacentType && !touchesBuildingTypeForState(state, originX, originY, size, BUILDINGS[type].requiresAdjacentType)) {
      return { valid: false, reason: "A Farm Barn must share an edge with a Field Farm." };
    }
    return { valid: true, reason: "" };
  }

  function placeBuilding(x, y) {
    const def = BUILDINGS[selectedBuilding];
    if (!def) return;
    const origin = getPlacementOrigin(def.id, x, y, selectedRotation);
    const placement = getPlacementStatus(def.id, origin.x, origin.y, selectedRotation);
    if (!placement.valid) {
      showMapMessage(placement.reason);
      return;
    }
    if (!buildingUnlocked(def)) {
      showMapMessage(`Requires ${def.unlockPopulation} citizens.`);
      return;
    }
    if (!canAfford(def.cost)) {
      const missing = Object.entries(def.cost)
        .filter(([resource, amount]) => state.resources[resource] < amount)
        .map(([resource, amount]) => `${Math.ceil(amount - state.resources[resource])} ${resource}`)
        .join(" and ");
      showMapMessage(`Need ${missing}.`);
      return;
    }

    payCost(def.cost);
    const placedSize = getBuildingSize(def.id, selectedRotation);
    addBuildingToState(state, def.id, origin.x, origin.y, state.day, state.nextBuildingId++, selectedRotation);
    applyEcoEffect(def.buildEco);
    state.stats.buildingsBuilt += 1;
    addLog(`${def.name} completed across ${placedSize.w} × ${placedSize.h} tiles near ${x + 1}, ${y + 1}.`);
    showToast(`${def.name} built`, def.impactLabel, def.short);
    updateObjectives();
    checkAchievements();
    saveGame();
    renderAll();
  }

  function destroyBuilding(x, y) {
    const building = getBuildingAt(x, y);
    if (!building) {
      showMapMessage("There is nothing to destroy here.");
      return;
    }
    const def = BUILDINGS[building.type];
    if (def.removable === false) {
      showMapMessage("The Founders’ Hearth cannot be destroyed.");
      return;
    }
    const dependentBarns = getFarmBarnRemovalBlockers(building);
    if (dependentBarns.length) {
      showMapMessage(`Cannot destroy this Field Farm: ${dependentBarns.length} attached Farm Barn${dependentBarns.length === 1 ? "" : "s"} needs another adjacent Field Farm first.`);
      return;
    }

    const housingAfter = getHousing() - (def.housing || 0);
    const warning = housingAfter < state.population
      ? ` This will leave ${Math.ceil(state.population - housingAfter)} people without housing.`
      : "";
    const overflowing = ["food", "water", "wood", "stone"].filter(resource => {
      const capacityAfter = getStorageCapacity(resource) - (def.storage || 0) - (def.storageByResource?.[resource] || 0);
      return state.resources[resource] > capacityAfter;
    });
    const storageWarning = overflowing.length
      ? ` Excess ${overflowing.join(", ")} will be lost because storage capacity will shrink.`
      : "";
    const approved = window.confirm(`Destroy ${def.name}? You will recover 50% of its original materials.${warning}${storageWarning}`);
    if (!approved) return;

    for (const [resource, amount] of Object.entries(def.cost || {})) {
      storeResource(resource, amount * 0.5);
    }
    for (let dy = 0; dy < building.h; dy++) {
      for (let dx = 0; dx < building.w; dx++) state.occupancy[tileIndex(building.x + dx, building.y + dy)] = 0;
    }
    state.buildings = state.buildings.filter(item => item.id !== building.id);
    rosterDirty = true;
    clampResourcesToStorage();
    applyEcoEffect({ soil: -0.22, biodiversity: -0.08 });
    if (def.impact === "restores") applyEcoEffect({ biodiversity: -0.35, wildlife: -0.2 });
    addLog(`${def.name} was destroyed. Half of its original materials were recovered.`);
    showToast(`${def.name} destroyed`, "50% of its materials were recovered.", "⌁");
    saveGame();
    renderAll();
  }

  function getCityTradeRemaining(trade) {
    return Math.max(0, Number(trade?.dueAt) - getWorldTime());
  }

  function openCityMarketPanel(building) {
    if (!building || building.type !== "market" || !isCityMarketUnlocked()) return;
    const season = getSeason();
    const marketEvent = getActiveCityMarketEvent();
    const pendingTrades = Array.isArray(state.cityTrades) ? state.cityTrades.slice().sort((a, b) => a.dueAt - b.dueAt) : [];
    const offers = Object.keys(CITY_RESOURCE_LABELS).map(resource => {
      const price = getCityMarketPrice(resource, season.id);
      const sellMax = Math.max(0, Math.floor(state.resources[resource] || 0));
      const buyUnitCost = getCityTradeCoinAmount("buy", resource, 1);
      const buyMax = Math.max(0, Math.floor((state.coins || 0) / buyUnitCost));
      const sellAmount = Math.min(CITY_TRADE_AMOUNT, sellMax);
      const buyAmount = Math.min(CITY_TRADE_AMOUNT, buyMax);
      const sellId = `cityTrade-sell-${resource}`;
      const buyId = `cityTrade-buy-${resource}`;
      const specialPrice = Number(marketEvent?.modifiers?.[resource]);
      const priceDetail = specialPrice
        ? `${marketEvent.title}: ${specialPrice > 1 ? "higher" : "lower"} than the normal ${season.name.toLowerCase()} price.`
        : `Seasonal ${season.name.toLowerCase()} price.`;
      return `<article class="market-offer">
        <strong>${escapeHtml(CITY_RESOURCE_LABELS[resource])}</strong><span class="cost-chip">${price.toFixed(2)} coin/unit</span>
        <small>${escapeHtml(priceDetail)} Price is fixed when dispatched.</small>
        <div class="market-trade-control">
          <label for="${sellId}">Sell <output id="${sellId}-value">${sellAmount}</output> / ${sellMax}</label>
          <input id="${sellId}" type="range" min="${sellMax ? 1 : 0}" max="${sellMax}" value="${sellAmount}" data-city-trade-slider="sell" data-resource="${resource}" ${sellMax ? "" : "disabled"}>
          <small id="${sellId}-quote">Receive ${sellAmount ? getCityTradeCoinAmount("sell", resource, sellAmount) : 0} coins</small>
          <button class="secondary-button" type="button" data-city-trade="sell" data-resource="${resource}" data-trade-slider-id="${sellId}" ${sellMax ? "" : "disabled"}>Send ${sellAmount || 0} to city</button>
        </div>
        <div class="market-trade-control">
          <label for="${buyId}">Buy <output id="${buyId}-value">${buyAmount}</output> / ${buyMax}</label>
          <input id="${buyId}" type="range" min="${buyMax ? 1 : 0}" max="${buyMax}" value="${buyAmount}" data-city-trade-slider="buy" data-resource="${resource}" ${buyMax ? "" : "disabled"}>
          <small id="${buyId}-quote">Costs ${buyAmount ? getCityTradeCoinAmount("buy", resource, buyAmount) : 0} coins · ${buyUnitCost} per unit</small>
          <button class="primary-button" type="button" data-city-trade="buy" data-resource="${resource}" data-trade-slider-id="${buyId}" ${buyMax ? "" : "disabled"}>Order ${buyAmount || 0}</button>
        </div>
      </article>`;
    }).join("");
    const queue = pendingTrades.length
      ? pendingTrades.map(trade => `<div class="market-queue-item"><span><strong>${escapeHtml(cityTradeDescription(trade))}</strong><br><small>${trade.direction === "sell" ? "City payment" : "City delivery"} is on the road</small></span><strong>${escapeHtml(formatWeatherDuration(getCityTradeRemaining(trade)))}</strong></div>`).join("")
      : `<div class="market-queue-item"><span><strong>No caravans travelling</strong><br><small>Dispatch goods or place an order below.</small></span><strong>Ready</strong></div>`;
    const marketSpecial = marketEvent
      ? `<div class="market-balance"><strong>${escapeHtml(marketEvent.icon)} ${escapeHtml(marketEvent.title)}</strong> · ${escapeHtml(marketEvent.description)} <small>${escapeHtml(formatWeatherDuration(state.cityMarketEvent.until - getWorldTime()))}</small></div>`
      : `<div class="market-balance"><strong>◇ Market conditions normal</strong> · Seasonal prices are in effect.</div>`;
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="cityMarketTitle">
          <div class="sheet-heading">
            <div><span class="eyebrow">CITY EXCHANGE · ${escapeHtml(season.name.toUpperCase())} PRICES</span><h2 id="cityMarketTitle">Market caravan desk</h2></div>
            <button class="sheet-close" type="button" aria-label="Close">×</button>
          </div>
          <div class="modal-icon" aria-hidden="true">◇</div>
          <p class="modal-description">Send village goods to the nearby city for coins, or spend coins on supplies. Every caravan takes exactly ${CITY_TRADE_DURATION_DAYS} in-game days. Seasonal and temporary special prices are fixed when dispatched. Coins are stored indefinitely; delivered goods still need room in village storage.</p>
          <div class="market-balance">Treasury <strong>● ${Math.floor(state.coins || 0).toLocaleString()}</strong> coins · no storage limit</div>
          ${marketSpecial}
          <h3>City offers</h3>
          <div class="market-offers">${offers}</div>
          <h3>Caravans in transit</h3>
          <div class="market-queue">${queue}</div>
          <div class="inspection-actions">
            <button id="backToMarketBuilding" class="secondary-button" type="button">Back to Market</button>
          </div>
        </section>
      </div>`;
    dom.modalLayer.querySelector(".sheet-close").addEventListener("click", () => closeModal(true));
    dom.modalLayer.querySelector("#backToMarketBuilding").addEventListener("click", () => inspectBuilding(building.x, building.y));
    const updateTradeControl = slider => {
      const amount = Math.max(0, Math.floor(Number(slider.value) || 0));
      const direction = slider.dataset.cityTradeSlider;
      const resource = slider.dataset.resource;
      const button = dom.modalLayer.querySelector(`[data-city-trade="${direction}"][data-resource="${resource}"]`);
      const output = document.getElementById(`${slider.id}-value`);
      const quote = document.getElementById(`${slider.id}-quote`);
      const coins = getCityTradeCoinAmount(direction, resource, amount);
      if (output) output.textContent = String(amount);
      if (quote) quote.textContent = direction === "sell" ? `Receive ${coins} coins` : `Costs ${coins} coins · ${getCityTradeCoinAmount("buy", resource, 1)} per unit`;
      if (button) button.textContent = direction === "sell" ? `Send ${amount} to city` : `Order ${amount}`;
    };
    dom.modalLayer.querySelectorAll("[data-city-trade-slider]").forEach(slider => {
      slider.addEventListener("input", () => updateTradeControl(slider));
    });
    dom.modalLayer.querySelectorAll("[data-city-trade]").forEach(button => {
      button.addEventListener("click", () => {
        const slider = document.getElementById(button.dataset.tradeSliderId);
        const trade = dispatchCityTrade(button.dataset.cityTrade, button.dataset.resource, slider?.value);
        if (!trade) return;
        renderAll();
        openCityMarketPanel(building);
      });
    });
  }

  function inspectBuilding(x, y) {
    const building = getBuildingAt(x, y);
    if (!building) {
      const waterway = getWaterwayType(x, y);
      const terrain = waterway
        ? `${areWaterwaysFrozen() ? "Frozen " : ""}${waterway === "river" ? "river channel" : "forest creek"}`
        : isClearing(x, y) ? "Open clearing" : "Old-growth forest";
      showMapMessage(`${terrain} · tile ${x + 1}, ${y + 1}`);
      return;
    }
    const def = BUILDINGS[building.type];
    const workerCapacity = getWorkerCapacity(def);
    const assignedWorkers = getAssignedWorkers(building.id);
    const output = buildingOutputDescription(def.id);
    const eco = Object.entries(def.dailyEco || {})
      .map(([metric, value]) => `${value > 0 ? "+" : ""}${value.toFixed(2)} ${ECO_LABELS[metric].toLowerCase()}/day`)
      .join(" · ") || "No ongoing ecological effect";
    const familyService = def.schoolSeats
      ? `<div class="inspection-row"><span>School service</span><strong>${def.schoolSeats} places · village education ${Math.round(state.education)}</strong></div>`
      : def.childSupport
        ? `<div class="inspection-row"><span>Child service</span><strong>Supports ${def.childSupport} children</strong></div>`
        : "";
    const contextRows = [];
    const inspectionControls = [];
    const scheduleText = def.bridge
      ? "Permanent crossing · no workers required"
      : def.automaticProduction !== undefined && workerCapacity
      ? `Automatic baseline day and night · helper boost ${getStaffedShiftLabel()}`
      : def.jobs
        ? `${getStaffedShiftLabel()} · staffed work stops at night`
        : "Automatic · operates day and night";
    contextRows.push(`<div class="inspection-row"><span>Operating schedule</span><strong>${scheduleText}</strong></div>`);
    if (workerCapacity) {
      const priority = getWorkPriorityMeta(building.staffingPriority);
      const assignedNames = state.people.filter(person => person.workBuildingId === building.id).map(person => person.name);
      contextRows.push(`<div class="inspection-row" data-building-priority-row><span>Job priority</span><strong>${priority.icon} ${priority.label} · ${assignedWorkers} / ${workerCapacity} slots currently filled</strong></div>`);
      contextRows.push(`<div class="inspection-row"><span>Assigned citizens</span><strong>${assignedNames.length ? escapeHtml(assignedNames.join(", ")) : "Waiting for workers"}</strong></div>`);
      inspectionControls.push(`<div class="work-priority-control">
        <div><strong>Workplace staffing priority</strong><small>High fills before Normal and Low inside its tier. Required jobs always fill before optional helper slots.</small></div>
        ${workPriorityButtonsHtml("building-work-priority", priority.id, `Staffing priority for ${def.name}`)}
      </div>`);
    }
    if (def.fullStaffProduction) {
      const multiplier = getBuildingProductionMultiplier(building, state, !isVillagerNight(), 1);
      contextRows.push(`<div class="inspection-row"><span>Staffing boost</span><strong>${assignedWorkers} / ${workerCapacity} · ${formatProductionMultiplier(multiplier)}× ${building.type === "farm" ? "food" : "water"} output · 3 workers = 2×</strong></div>`);
    }
    if (building.type === "market") {
      const pendingTrades = Array.isArray(state.cityTrades) ? state.cityTrades.length : 0;
      contextRows.push(`<div class="inspection-row"><span>City exchange</span><strong>Unlocked · ${Math.floor(state.coins || 0).toLocaleString()} coins stored indefinitely · ${pendingTrades} caravan${pendingTrades === 1 ? "" : "s"} travelling</strong></div>`);
      inspectionControls.push(`<button id="openCityMarketButton" class="primary-button" type="button">Trade with the city</button>`);
    }
    if (building.type === "lumber") {
      const localTrees = getLoggingTreesInRange(building).length;
      const localStumps = getLoggingStumpsInRange(building).length;
      const remoteStumps = getRemoteLoggingStumps(building).length;
      const workStumps = getLoggingWorkStumps(building);
      const woodFarms = getWoodFarmsInRange(building);
      const farmTrees = getMatureWoodFarmSupply(building).length;
      const nextMaturity = getNextWoodFarmMaturity(building);
      const loggingTarget = getLoggingTarget(building);
      const priorityCount = getPrioritizedTrees().length;
      const priorityStumpCount = workStumps.filter(stump => stump.priority).length;
      const priorityStump = getPriorityStumpForCamp(building);
      const priorityStumpActive = Boolean(priorityStump);
      const priorityTreeActive = Boolean(loggingTarget?.priority) && !priorityStumpActive;
      const stumpWorkers = priorityStumpActive || (!priorityTreeActive && workStumps.length) ? assignedWorkers : 0;
      const nextTimberYield = getLoggingTargetTimberYield(loggingTarget);
      const projectedTimberRate = getProjectedLoggingTimberRate(building);
      const storageFull = isTimberStorageFull();
      const storageBlocked = isLoggingStorageBlocked(building);
      const timberStatus = storageBlocked
        ? "STORAGE TOO FULL FOR NEXT LOAD — automatic pause"
        : isVillagerNight()
        ? `NIGHT SHUTDOWN — resumes at ${formatVillageTime(STAFFED_SHIFT_START_HOUR)}`
        : priorityStumpActive
          ? `Priority stump at ${priorityStump.inRange ? "10×" : "regular"} clearing speed`
        : priorityTreeActive
        ? `Priority at ${loggingTarget.inRange ? "10×" : "regular"} felling speed`
        : workStumps.length
          ? `FELLING PAUSED — ${priorityStumpCount ? "priority stump" : "ordinary stump"} work`
        : loggingTarget?.kind === "farm"
          ? "Managed timber at 10× speed"
        : localTrees
          ? "Automatic local felling at 10× speed"
          : loggingTarget?.remote
            ? `Automatic outside-zone felling at the ${OUTSIDE_TREE_FELLING_HOURS}-hour full-crew pace`
            : "STOPPED — no mature trees";
      const regrowthText = !farmTrees && nextMaturity !== null ? ` · next ready in ${nextMaturity.toFixed(1)} days` : "";
      contextRows.push(`<div class="inspection-row"><span>Logging zone</span><strong>${localTrees} standing trees · ${localStumps} stump${localStumps === 1 ? "" : "s"} · ${timberStatus}</strong></div>`);
      contextRows.push(`<div class="inspection-row"><span>Priority work</span><strong>${priorityCount} marked tree${priorityCount === 1 ? "" : "s"} · ${priorityStumpCount} marked stump${priorityStumpCount === 1 ? "" : "s"} · ${remoteStumps} remote stump${remoteStumps === 1 ? "" : "s"}</strong></div>`);
      contextRows.push(`<div class="inspection-row"><span>Managed timber</span><strong>${woodFarms.length} nearby Wood Farm${woodFarms.length === 1 ? "" : "s"} · ${farmTrees} mature tree${farmTrees === 1 ? "" : "s"}${regrowthText} · mature plots before unmarked wild trees</strong></div>`);
      contextRows.push(`<div class="inspection-row"><span>Timber harvest</span><strong>${loggingTarget ? `${nextTimberYield} from next tree` : "No tree ready"} · ${OUTSIDE_TREE_FELLING_HOURS}-hour outside-zone base with ${STANDARD_LOGGING_CREW} workers · ${(OUTSIDE_TREE_FELLING_HOURS / IN_RANGE_LOGGING_MULTIPLIER * 60).toFixed(0)}-minute base inside · weather and worker conditions modify exact time · ${projectedTimberRate.toFixed(1)}/working day now</strong></div>`);
      contextRows.push(`<div class="inspection-row"><span>Stump crew</span><strong>${priorityTreeActive ? "Waiting for marked tree" : `${stumpWorkers} worker${stumpWorkers === 1 ? "" : "s"} assigned`} · each worker adds 0.5× standard crew speed · same five-hour / 10× location rule as chopping · marked stumps first · ${Math.round((Number(building.stumpProgress) || 0) * 100)}% toward next clearing tile</strong></div>`);
      contextRows.push(`<div class="inspection-row"><span>Full-storage rule</span><strong id="loggingStoragePolicy">${building.workWhenStorageFull === true ? `Manual override on · work continues${storageFull ? " and excess timber is discarded" : " if storage fills"}` : `Automatic pause on · ${storageBlocked ? "camp is waiting for enough room for its next load" : "camp will stop before wasting timber"}`}</strong></div>`);
      inspectionControls.push(`<button id="loggingStorageOverride" class="secondary-button" type="button" aria-pressed="${building.workWhenStorageFull === true}">${building.workWhenStorageFull === true ? "Restore automatic full-storage pause" : "Allow work when timber storage is full"}</button>`);
    }
    if (building.type === "wood_farm") {
      const mature = getMatureWoodFarmPlots(building).length;
      const remaining = building.woodFarmPlots.reduce((soonest, _, index) => {
        const days = Math.max(0, WOOD_FARM_GROWTH_DAYS - getWoodFarmPlotAge(building, index));
        return soonest === null || days < soonest ? days : soonest;
      }, null);
      const nearbyCamps = state.buildings.filter(camp => camp.type === "lumber" && woodFarmTouchesLoggingZone(camp, building)).length;
      contextRows.push(`<div class="inspection-row"><span>Tree plots</span><strong>${mature} / ${WOOD_FARM_PLOTS} mature${mature < WOOD_FARM_PLOTS ? ` · next ready in ${remaining.toFixed(1)} days` : " · ready to harvest"}</strong></div>`);
      contextRows.push(`<div class="inspection-row"><span>Yield per tree</span><strong>${TREE_TIMBER_MIN}–${TREE_TIMBER_MAX} timber · exact yield varies by plot</strong></div>`);
      contextRows.push(`<div class="inspection-row"><span>Logging access</span><strong>${nearbyCamps} nearby Logging Camp${nearbyCamps === 1 ? "" : "s"}</strong></div>`);
    }
    if (def.bridge) {
      const waterTiles = [];
      for (let y = building.y; y < building.y + building.h; y++) {
        for (let x = building.x; x < building.x + building.w; x++) if (getWaterwayType(x, y)) waterTiles.push({ x, y });
      }
      contextRows.push(`<div class="inspection-row"><span>Water crossing</span><strong>${waterTiles.length} ${def.bridge} tile${waterTiles.length === 1 ? "" : "s"} spanned · every bridge tile is walkable</strong></div>`);
      contextRows.push(`<div class="inspection-row"><span>Channel protection</span><strong>Water continues beneath the deck instead of being filled or blocked</strong></div>`);
    }
    if (def.housing) {
      const residents = state.people.filter(person => person.homeBuildingId === building.id);
      const indoors = villagers.filter(person => person.indoors && person.indoorBuildingId === building.id).length;
      contextRows.push(`<div class="inspection-row"><span>Residents at home</span><strong>${indoors} indoors · ${residents.length} / ${def.housing} assigned</strong></div>`);
      const homeNoise = getHousingNoiseInfo(building);
      const noiseSources = homeNoise.sources.map(source => BUILDINGS[source.building.type].name).join(", ");
      const sourceStatus = noiseSources
        ? escapeHtml(noiseSources)
        : homeNoise.sourcesInRange
          ? "Nearby source currently quiet"
          : "No noise source reaches this home";
      const exposureText = homeNoise.sources.length && homeNoise.residents
        ? `${homeNoise.residents} resident${homeNoise.residents === 1 ? "" : "s"} exposed · -${homeNoise.moodLoss.toFixed(2)} morale/day · -${homeNoise.healthLoss.toFixed(2)} health/day`
        : homeNoise.sources.length
          ? `No residents assigned · potential -${homeNoise.moodLoss.toFixed(2)} morale/day and -${homeNoise.healthLoss.toFixed(2)} health/day if occupied`
          : "No active wellbeing loss";
      contextRows.push(`<div class="inspection-row"><span>Residential noise</span><strong>${homeNoise.sourcesInRange} source${homeNoise.sourcesInRange === 1 ? "" : "s"} within their active noise zones · ${sourceStatus} · ${exposureText}</strong></div>`);
    }
    if (def.storage || def.storageByResource) {
      const storedResources = def.storage
        ? `${def.storage} food, water, timber and stone each`
        : Object.entries(def.storageByResource).map(([resource, amount]) => `${amount} ${resource} only`).join(" · ");
      const storageTotal = def.storage ? `${getStorageCapacity("wood")} each` : `${getStorageCapacity("food")} food`;
      contextRows.push(`<div class="inspection-row"><span>Resource storage</span><strong>${storedResources} · village total ${storageTotal}</strong></div>`);
    }
    if (["lumber", "quarry"].includes(building.type)) {
      contextRows.push(`<div class="inspection-row"><span>Producer overlap</span><strong>No penalty · timber and stone sites do not suppress one another</strong></div>`);
    }
    if (["farm", "orchard"].includes(building.type)) {
      const cropPollution = getCropPollutionInfo(building);
      const sourceNames = cropPollution.sources.map(source => BUILDINGS[source.building.type].name).join(", ");
      contextRows.push(`<div class="inspection-row"><span>Pollution pressure</span><strong>${Math.round(cropPollution.penalty * 100)}% output loss${sourceNames ? ` · ${escapeHtml(sourceNames)}` : ""}</strong></div>`);
    }
    if (def.pollution) {
      const forestPollution = getForestPollutionInfo(building);
      const affectedCrops = state.buildings.filter(crop => ["farm", "orchard"].includes(crop.type) && getCropPollutionInfo(crop).sources.some(source => source.building.id === building.id));
      contextRows.push(`<div class="inspection-row"><span>Local pollution</span><strong>${affectedCrops.length} crop site${affectedCrops.length === 1 ? "" : "s"} affected · ${forestPollution.trees} nearby forest tree${forestPollution.trees === 1 ? "" : "s"} · -${forestPollution.penalty.toFixed(1)} wildlife/day</strong></div>`);
    }
    if (def.noise) {
      const noise = getNoiseSourceHousingInfo(building);
      const noiseEffect = noise.activity > 0.00001
        ? `-${noise.moodLoss.toFixed(2)} village morale/day · -${noise.healthLoss.toFixed(2)} health/day`
        : "Currently quiet · no active wellbeing loss";
      contextRows.push(`<div class="inspection-row"><span>Noise pollution</span><strong>${noise.occupiedHomes} occupied / ${noise.homesInRange} total home${noise.homesInRange === 1 ? "" : "s"} in the ${noise.range}-tile zone · ${noise.exposedResidents} resident${noise.exposedResidents === 1 ? "" : "s"} · ${noiseEffect}</strong></div>`);
    }
    const learningNote = buildingLearningNote(building);
    const decisionPrompt = buildingDecisionPrompt(building);
    pauseForModal(true);
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="inspectTitle">
          <div class="sheet-heading">
            <div><span class="eyebrow">${building.w} × ${building.h} FOOTPRINT · BUILT DAY ${building.builtDay}</span><h2 id="inspectTitle">${escapeHtml(def.name)}</h2></div>
            <button class="sheet-close" type="button" aria-label="Close">×</button>
          </div>
          <div class="modal-icon" aria-hidden="true">${escapeHtml(def.short)}</div>
          <p class="modal-description">${escapeHtml(def.description)}</p>
          <div class="inspection-grid">
            <div class="inspection-row"><span>Workers</span><strong>${workerCapacity ? `${assignedWorkers} / ${workerCapacity} assigned${def.jobs ? "" : " · optional"}` : "None"}</strong></div>
            <div class="inspection-row"><span>Housing</span><strong>${def.housing || "None"}</strong></div>
            <div class="inspection-row"><span>Footprint</span><strong>${building.w} × ${building.h} tiles · ${["North", "East", "South", "West"][normaliseRotation(building.rotation)]}</strong></div>
            ${familyService}
            ${contextRows.join("")}
            <div class="inspection-row"><span>Typical output</span><strong>${escapeHtml(output)}</strong></div>
            <div class="inspection-row"><span>Ongoing nature effect</span><strong>${escapeHtml(eco)}</strong></div>
            <div class="inspection-row"><span>Environmental lesson</span><strong>${escapeHtml(learningNote)}</strong></div>
            <div class="inspection-row learning-question-row"><span>Ask as steward</span><strong>${escapeHtml(decisionPrompt)}</strong></div>
          </div>
          ${inspectionControls.length ? `<div class="inspection-actions">${inspectionControls.join("")}</div>` : ""}
        </section>
      </div>`;
    dom.modalLayer.querySelector(".sheet-close").addEventListener("click", () => closeModal(true));
    dom.modalLayer.querySelectorAll("[data-building-work-priority]").forEach(button => {
      button.addEventListener("click", () => {
        const nextPriority = normaliseWorkPriority(button.dataset.buildingWorkPriority);
        if (nextPriority === normaliseWorkPriority(building.staffingPriority)) return;
        building.staffingPriority = nextPriority;
        assignPeopleJobs();
        const priority = getWorkPriorityMeta(nextPriority);
        addLog(`${def.name} staffing priority changed to ${priority.label.toLowerCase()}.`);
        showToast(`${priority.label} job priority`, `${def.name} now competes for workers at ${priority.label.toLowerCase()} priority.`, priority.icon);
        saveGame();
        const resumeWhenClosed = modalResume;
        renderAll();
        inspectBuilding(building.x, building.y);
        modalResume = resumeWhenClosed;
      });
    });
    const loggingStorageOverride = dom.modalLayer.querySelector("#loggingStorageOverride");
    if (loggingStorageOverride) {
      loggingStorageOverride.addEventListener("click", () => {
        building.workWhenStorageFull = building.workWhenStorageFull !== true;
        const overrideEnabled = building.workWhenStorageFull === true;
        const storageFull = isTimberStorageFull();
        const storageBlocked = isLoggingStorageBlocked(building);
        loggingStorageOverride.setAttribute("aria-pressed", String(overrideEnabled));
        loggingStorageOverride.textContent = overrideEnabled ? "Restore automatic full-storage pause" : "Allow work when timber storage is full";
        const policy = dom.modalLayer.querySelector("#loggingStoragePolicy");
        if (policy) {
          policy.textContent = overrideEnabled
            ? `Manual override on · work continues${storageFull ? " and excess timber is discarded" : " if storage fills"}`
            : `Automatic pause on · ${storageBlocked ? "camp is waiting for enough room for its next load" : "camp will stop before wasting timber"}`;
        }
        addLog(`${def.name} ${overrideEnabled ? "was manually allowed to work with full timber storage" : "will now pause automatically when timber storage fills"}.`);
        showToast(overrideEnabled ? "Full-storage override enabled" : "Storage safeguard restored", overrideEnabled ? "This camp may keep clearing, but excess timber will be lost." : "This camp will stop before cutting trees for timber that cannot be stored.", overrideEnabled ? "!" : "✓");
        saveGame();
        renderAll();
      });
    }
    const openCityMarketButton = dom.modalLayer.querySelector("#openCityMarketButton");
    if (openCityMarketButton) openCityMarketButton.addEventListener("click", () => openCityMarketPanel(building));
  }

  function inspectVillager(person) {
    const info = personWorkInfo(person);
    const workPriority = getWorkPriorityMeta(person.workPriority);
    const home = getBuildingById(person.homeBuildingId);
    const homeName = home ? BUILDINGS[home.type].name : "No assigned home";
    const visual = villagers.find(item => item.personId === person.id);
    const destinationBuilding = getBuildingById(visual?.targetBuildingId);
    const destination = destinationBuilding
      ? `${visual.targetPurpose === "deliver" ? "Delivering to" : visual.targetPurpose === "home" ? "Returning to" : "Heading to"} ${BUILDINGS[destinationBuilding.type].name}`
      : "Walking through the village";
    const carrying = person.carriedAmount
      ? `${person.carriedAmount} ${person.carriedItem}`
      : "Nothing right now";
    const ageLabel = person.ageGroup === "child" ? "Child" : person.ageGroup === "elder" ? "Elder" : "Adult";
    const currentTime = getWorldTime();
    const birthAt = Number.isFinite(Number(person.birthAt)) ? Number(person.birthAt) : currentTime;
    const currentAge = Math.max(0, currentTime - birthAt);
    const originLabel = person.origin === "traveller"
      ? "Travelling family"
      : person.origin === "founder"
        ? "Original founder"
        : person.origin === "village-born" ? "Born in the village" : "Established resident";
    pauseForModal(true);
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card resident-modal" role="dialog" aria-modal="true" aria-labelledby="residentTitle">
          <div class="sheet-heading">
            <div><span class="eyebrow">VILLAGE RESIDENT · ${ageLabel.toUpperCase()}</span><h2 id="residentTitle">${escapeHtml(person.name)}</h2></div>
            <button class="sheet-close" type="button" aria-label="Close">×</button>
          </div>
          <div class="modal-icon resident-portrait" aria-hidden="true">${escapeHtml(person.name.charAt(0))}</div>
          <p class="modal-description">${escapeHtml(info.title)} in ${escapeHtml(state.villageName)}. This resident can carry up to ${person.carryCapacity} item${person.carryCapacity === 1 ? "" : "s"} per trip. Work priority changes assignment order only—it does not change this person’s value, health or ability.</p>
          <div class="inspection-grid">
            <div class="inspection-row"><span>Life stage</span><strong>${ageLabel}</strong></div>
            <div class="inspection-row"><span>Age</span><strong>${currentAge.toFixed(1)} days</strong></div>
            <div class="inspection-row"><span>Origin</span><strong>${escapeHtml(originLabel)}</strong></div>
            <div class="inspection-row"><span>Role</span><strong>${escapeHtml(info.title)}</strong></div>
            <div class="inspection-row"><span>Work or school</span><strong>${escapeHtml(info.workplace)}</strong></div>
            <div class="inspection-row" data-person-priority-row><span>Work priority</span><strong>${workPriority.icon} ${workPriority.label}${person.ageGroup === "child" ? " · takes effect when grown" : " · considered in this order for available jobs"}</strong></div>
            <div class="inspection-row"><span>Home</span><strong>${escapeHtml(homeName)}</strong></div>
            <div class="inspection-row"><span>Carrying</span><strong>${escapeHtml(carrying)}</strong></div>
            <div class="inspection-row"><span>Carry capacity</span><strong>${person.carryCapacity} item${person.carryCapacity === 1 ? "" : "s"}</strong></div>
            <div class="inspection-row"><span>Current journey</span><strong>${escapeHtml(destination)}</strong></div>
            <div class="inspection-row"><span>Resident since</span><strong>Day ${person.joinedDay}</strong></div>
          </div>
          <div class="inspection-actions">
            <div class="work-priority-control">
              <div><strong>Citizen work priority</strong><small>${person.ageGroup === "child" ? "Saved now and used when this child becomes an adult." : "High-priority citizens are considered first, followed by Normal and Low. Workplace priorities decide which open job they receive."}</small></div>
              ${workPriorityButtonsHtml("person-work-priority", workPriority.id, `Work priority for ${person.name}`)}
            </div>
          </div>
        </section>
      </div>`;
    dom.modalLayer.querySelector(".sheet-close").addEventListener("click", () => closeModal(true));
    dom.modalLayer.querySelectorAll("[data-person-work-priority]").forEach(button => {
      button.addEventListener("click", () => {
        const nextPriority = normaliseWorkPriority(button.dataset.personWorkPriority);
        if (nextPriority === normaliseWorkPriority(person.workPriority)) return;
        person.workPriority = nextPriority;
        assignPeopleJobs();
        const priority = getWorkPriorityMeta(nextPriority);
        addLog(`${person.name}'s work priority changed to ${priority.label.toLowerCase()}.`);
        showToast(`${priority.label} citizen priority`, person.ageGroup === "child" ? "This will apply when they grow into an adult." : "Work assignments have been recalculated.", priority.icon);
        saveGame();
        const resumeWhenClosed = modalResume;
        renderAll();
        inspectVillager(person);
        modalResume = resumeWhenClosed;
      });
    });
  }

  function buildingOutputDescription(type) {
    const descriptions = {
      hearth: "12 housing and 400 storage for each resource",
      cottage: "6 housing",
      storage: "+200 food, water, timber and stone capacity",
      barn: "+500 food-only capacity beside a Field Farm",
      water_tank: "+500 water-only capacity",
      timber_yard: "+500 timber-only capacity",
      stone_depot: "+500 stone-only capacity",
      large_storage: "+500 food, water, timber and stone capacity",
      creek_bridge: "A walkable crossing over one creek tile without filling the channel",
      river_bridge: "A walkable crossing over three river tiles without filling the channel",
      farm: "About 25 food/day with two farmers; up to 50/day with three before season, soil and nearby pollution",
      well: "About 29 water/day before weather and water quality",
      river_pump: "24 water/day from a neighbouring creek or river; −0.05 wildlife/day",
      lumber: "A five-hour outside-zone base felling time with a full crew, 10× speed inside the zone, matching stump speed, 5–10 timber from healthy trees, 30% less from fire-damaged trees, and a full-storage pause unless manually overridden",
      wood_farm: "16 managed tree plots; each supplies 5–10 timber and regrows in 5 days",
      hunter: "About 16 food/day before wildlife health",
      quarry: "About 31 stone/day",
      forester: "About 8.5 timber/day plus forest restoration",
      sanctuary: "Ecosystem restoration",
      orchard: "About 15 food/day plus habitat",
      apiary: "5.5 food/day and +6% farm/orchard output",
      rain_garden: "About 13 water/day automatically; up to 26/day with three daytime helpers, plus filtration",
      compost: "Strong soil recovery and lower pollution",
      granary: "5.5% less food consumption and waste",
      reservoir: "About 20 water/day in most weather",
      market: "Production efficiency, happiness and three-day city trade with indefinitely stored coins",
      windmill: "+20% output to every farm",
      school: "Up to 16 school places with a teacher, education, and 11% less ecological harm",
      playground: "Health and happiness for up to 10 children",
      park: "Happiness and habitat",
      townhouse: "16 housing",
      clinic: "Health recovery",
      workshop: "6.5 timber and 5.5 stone/day, with strong local pollution",
      townhall: "30% faster population growth"
    };
    return descriptions[type] || "Community service";
  }

  function buildingLearningNote(building) {
    const type = building.type;
    if (BUILDINGS[type]?.bridge) return "Bridges can connect people without filling a stream channel. Keeping water moving preserves downstream flow and gives aquatic life a more continuous habitat than a solid earth crossing.";
    if (type === "lumber") return "Timber is renewable only when nearby trees regrow as quickly as loggers harvest them. The full-storage pause avoids destroying habitat for material the village cannot use and also silences the camp; repeated felling noise near homes lowers wellbeing.";
    if (type === "wood_farm") return "Managed trees reduce pressure on wild forest, but sixteen uniform timber plots cannot replace the species and habitat variety of old growth.";
    if (type === "forester") return "Restoration and harvesting can coexist when planting is diverse and recovery is faster than removal.";
    if (type === "hunter") return "Wildlife is renewable only while breeding populations and habitat remain healthy; high harvest pressure can cross that limit.";
    if (type === "farm") return "Food production depends on healthy soil, clean water and pollinators. A third farmer doubles the harvest, but also doubles the Farm’s water use and operational pressure on nature.";
    if (type === "orchard") return "Food production depends on healthy soil, clean water and pollinators. Nearby pollution makes that ecosystem service less productive.";
    if (type === "apiary") return "Pollinators connect wild habitat to food production, so biodiversity can directly improve harvests.";
    if (type === "well") return "Groundwater is renewed by a slow water cycle. Several clean Wells can still extract water faster than rainfall replaces it.";
    if (type === "river_pump") return "A screened river intake can supply water without blocking a channel, but even a small withdrawal can disturb aquatic habitat. This pump's only ecological effect is −0.05 wildlife per day.";
    if (type === "rain_garden") return "Capturing rain and slowing runoff works with the water cycle instead of relying only on extraction. Optional helpers can double both collected water and beneficial filtration during the day.";
    if (type === "reservoir") return "Capturing rain and slowing runoff helps the village work with the water cycle instead of relying only on extraction.";
    if (type === "compost") return "Compost returns organic matter and nutrients to soil, closing part of the village’s material cycle.";
    if (["sanctuary", "park", "playground"].includes(type)) return "Green spaces provide habitat, cooling and wellbeing. Connected and varied spaces protect more life than isolated patches.";
    if (type === "windmill") return "Cleaner technology can raise output without fuel combustion, although construction, land use and low mechanical noise still matter. A housing buffer protects residents while keeping the clean-energy benefit.";
    if (BUILDINGS[type]?.pollution || BUILDINGS[type]?.noise) return "Pollution has local consequences. Separating fumes and noise from crops, forest edges and occupied homes is practical environmental zoning; quieter equipment and prevention at the source are stronger still.";
    if (["storage", "large_storage", "water_tank", "timber_yard", "stone_depot", "granary", "barn"].includes(type)) return type === "barn"
      ? "A barn can protect a farm harvest from overflowing, but it must sit beside its Field Farm and its footprint still puts pressure on living soil."
      : "Storage reduces waste and improves resilience, but it cannot create resources or remove the impacts of producing them.";
    if (["hearth", "cottage", "townhouse"].includes(type)) {
      const noise = getHousingNoiseInfo(building);
      return noise.sourcesInRange
        ? "Homes are places of long-duration exposure. Repeated unwanted sound can disrupt rest and wellbeing, so separating housing from loud work protects morale and health."
        : "Housing choices affect land, water and energy demand. Denser growth can save land, but every resident still needs resources and a healthy, quiet place to rest.";
    }
    if (type === "school") return "Environmental knowledge helps future workers reduce harm and make protection last across generations.";
    return "Compare this building’s benefit with its construction and daily effects; environmental decisions usually involve several connected outcomes.";
  }

  function buildingDecisionPrompt(building) {
    const type = building.type;
    if (BUILDINGS[type]?.bridge) return "Does this crossing keep the channel open, protect both banks and connect places people actually need to reach?";
    if (type === "lumber") return "Is timber demand worth the habitat removed, can every load be stored, and is regrowth keeping pace with felling?";
    if (type === "wood_farm") return "Does this managed supply reduce pressure on wild forest while leaving enough varied habitat for other species?";
    if (["farm", "orchard"].includes(type)) return "Can soil, water and pollinators recover as quickly as this food system uses them, and is local air clean enough for a reliable harvest?";
    if (["well", "river_pump", "reservoir", "rain_garden"].includes(type)) return "Does this add water security by restoring and capturing the cycle, or mainly by drawing more from it?";
    if (BUILDINGS[type]?.pollution || BUILDINGS[type]?.noise) return "Who or what is exposed here—crops, forest, water and residents at home—and could emissions or noise be prevented before a buffer is needed?";
    if (["sanctuary", "park", "playground", "apiary"].includes(type)) return "Which species and ecosystem process does this space support, and is it part of a varied habitat network?";
    if (["compost", "storage", "granary"].includes(type)) return "Does this prevent waste and close a material cycle, or only make room for greater consumption?";
    if (["hearth", "cottage", "townhouse"].includes(type)) return "Can food, water, services and a quiet night grow with these residents without pushing environmental demand or noise exposure beyond healthy limits?";
    if (["school", "clinic"].includes(type)) return "How does this service improve the community’s ability to prevent environmental harm, share knowledge and respond fairly?";
    if (type === "windmill") return "What impacts remain across construction, land use and materials even when operating emissions are low?";
    return "What benefit does this provide, which costs fall outside its footprint, and how will the village know when use has exceeded recovery?";
  }

  function showMapMessage(message) {
    dom.mapMessage.textContent = message;
    dom.mapMessage.classList.add("show");
    window.clearTimeout(mapMessageTimer);
    mapMessageTimer = window.setTimeout(() => dom.mapMessage.classList.remove("show"), 2200);
  }

  function pauseForModal(closable = true) {
    modalResume = gameActive && !state.paused;
    state.paused = true;
    modalClosable = closable;
  }

  function closeModal(resume = true) {
    dom.modalLayer.innerHTML = "";
    if (resume && modalResume && state && !state.gameOver) state.paused = false;
    modalResume = false;
    modalClosable = false;
    renderAll();
  }

  function showStartScreen() {
    if (gameActive) saveGame();
    gameActive = false;
    selectedBuilding = null;
    selectedRotation = 0;
    activeTool = "inspect";
    resetVillagers();
    const saved = readSavedGame();
    dom.modalLayer.innerHTML = "";
    dom.modalLayer.appendChild(document.getElementById("startScreenTemplate").content.cloneNode(true));
    const saveSlotList = document.getElementById("saveSlotList");
    const slotSaves = Array.from({ length: MAX_SAVE_SLOTS }, (_, index) => readSavedGame(index + 1));
    saveSlotList.innerHTML = slotSaves.map((slotSave, index) => {
      const slot = index + 1;
      const active = slot === activeSaveSlot;
      const detail = slotSave
        ? `${slotSave.villageName || "Unnamed village"} · Day ${slotSave.day || 1}${slotSave.gameOver ? " · ended" : ""}`
        : "Empty slot · start a new village here";
      const slotScore = slotSave?.ecosystem && Object.keys(slotSave.ecosystem).length ? Math.round(ecosystemScore(slotSave.ecosystem)) : 0;
      return `<button class="save-slot ${active ? "active" : ""}" type="button" data-save-slot="${slot}" aria-pressed="${active}"><strong>SLOT ${slot}</strong><span><strong>${escapeHtml(detail)}</strong><small>${slotSave ? `${Math.floor(slotSave.population || 0)} people · ${slotScore}% ecosystem` : "Available for a separate village"}</small></span><em>${active ? "Selected" : slotSave ? "Open" : "Empty"}</em></button>`;
    }).join("");
    saveSlotList.addEventListener("click", event => {
      const button = event.target.closest("[data-save-slot]");
      if (!button) return;
      const nextSlot = normaliseSaveSlot(button.dataset.saveSlot);
      if (nextSlot === activeSaveSlot) return;
      activeSaveSlot = nextSlot;
      showStartScreen();
    });
    const continueButton = document.getElementById("continueGameButton");
    if (saved && !saved.gameOver) {
      continueButton.hidden = false;
      continueButton.textContent = `Continue ${saved.villageName || "saved village"} · Day ${saved.day || 1}`;
      continueButton.addEventListener("click", () => {
        state = normaliseLoadedState(saved);
        resetVillagers();
        weatherVisualTime = 0;
        gameActive = true;
        state.paused = false;
        dom.modalLayer.innerHTML = "";
        addLog("The Steward returned to the planning desk.");
        renderAll();
      });
    }

    document.querySelectorAll(".difficulty-option input").forEach(input => {
      input.addEventListener("change", () => {
        document.querySelectorAll(".difficulty-option").forEach(label => label.classList.toggle("selected", label.contains(input)));
      });
    });

    const freeplaySetup = document.getElementById("freeplaySetup");
    const scenarioSetup = document.getElementById("scenarioSetup");
    const freeplayButton = document.getElementById("freeplayModeButton");
    const scenarioButton = document.getElementById("scenarioModeButton");
    const beginButton = document.getElementById("beginGameButton");
    const setStartMode = mode => {
      const scenariosOpen = mode === "scenarios";
      freeplaySetup.hidden = scenariosOpen;
      scenarioSetup.hidden = !scenariosOpen;
      beginButton.hidden = scenariosOpen;
      freeplayButton.classList.toggle("active", !scenariosOpen);
      scenarioButton.classList.toggle("active", scenariosOpen);
      freeplayButton.setAttribute("aria-selected", String(!scenariosOpen));
      scenarioButton.setAttribute("aria-selected", String(scenariosOpen));
    };
    freeplayButton.addEventListener("click", () => setStartMode("freeplay"));
    scenarioButton.addEventListener("click", () => setStartMode("scenarios"));
    document.getElementById("scenarioList").innerHTML = SCENARIOS.map(scenario => `
      <button class="scenario-option" type="button" data-scenario="${escapeHtml(scenario.id)}">
        <span class="scenario-option-icon" aria-hidden="true">${escapeHtml(scenario.icon)}</span>
        <span class="scenario-option-copy"><strong>${escapeHtml(scenario.name)}</strong>${scenario.restoration ? `<em class="restoration-scenario-tag">RESTORATION EMERGENCY · ${Math.round(ecosystemScore(scenario.ecosystem))}% AND FALLING</em>` : ""}<small>${escapeHtml(scenario.brief)}</small></span>
        <span class="scenario-option-meta">Day ${scenario.day}<br>${scenario.population} people<br>${Math.round(ecosystemScore(scenario.ecosystem))}% ecosystem<br>${escapeHtml(DIFFICULTIES[scenario.difficulty].name)}</span>
      </button>`).join("");
    document.getElementById("scenarioList").addEventListener("click", event => {
      const button = event.target.closest("[data-scenario]");
      if (!button) return;
      if (saved && !window.confirm(`Begin this scenario and replace Slot ${activeSaveSlot}'s current village? Achievements will be kept.`)) return;
      startScenario(button.dataset.scenario);
    });

    beginButton.addEventListener("click", () => {
      if (saved && !window.confirm(`Begin a new village and replace Slot ${activeSaveSlot}'s current village? Achievements will be kept.`)) return;
      const nameInput = document.getElementById("newVillageName");
      const difficulty = document.querySelector('input[name="difficulty"]:checked')?.value || "balanced";
      const name = nameInput.value.trim() || "Mossbank Clearing";
      startNewGame(name, difficulty);
    });
  }

  function startNewGame(name, difficulty) {
    state = createNewState(name, difficulty);
    resetVillagers();
    weatherVisualTime = 0;
    gameActive = true;
    selectedBuilding = null;
    selectedRotation = 0;
    activeTool = "inspect";
    dom.modalLayer.innerHTML = "";
    renderAll();
    saveGame();
    showBlog(false, true);
  }

  function startScenario(scenarioId) {
    const scenario = SCENARIOS.find(item => item.id === scenarioId);
    if (!scenario) return;
    state = createScenarioState(scenarioId);
    resetVillagers();
    state.stats.ecoDailyChange = getDailyAverageEcosystemRate();
    weatherVisualTime = 0;
    gameActive = true;
    selectedBuilding = null;
    selectedRotation = 0;
    activeTool = "inspect";
    dom.modalLayer.innerHTML = "";
    renderAll();
    showScenarioBriefing(scenario);
  }

  function showScenarioBriefing(scenario) {
    state.paused = true;
    modalResume = false;
    modalClosable = false;
    const score = Math.round(ecosystemScore());
    const season = getSeason();
    const projectedEcoRate = getDailyAverageEcosystemRate();
    const crisis = getScenarioCrisisState(scenario);
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card scenario-briefing" role="dialog" aria-modal="true" aria-labelledby="scenarioTitle">
          <div class="sheet-heading"><div><span class="eyebrow">SCENARIO · ${escapeHtml(getDifficulty().name.toUpperCase())} DIFFICULTY</span><h2 id="scenarioTitle">${escapeHtml(scenario.name)}</h2></div></div>
          <div class="modal-icon" aria-hidden="true">${escapeHtml(scenario.icon)}</div>
          <p class="modal-description">${escapeHtml(scenario.brief)}</p>
          <div class="inspection-grid">
            <div class="inspection-row"><span>Existing village</span><strong>${escapeHtml(scenario.villageName)} · ${state.buildings.length} buildings</strong></div>
            <div class="inspection-row"><span>Starting point</span><strong>Day ${state.day} · ${escapeHtml(season.name)} · ${state.population} residents</strong></div>
            <div class="inspection-row"><span>Living system</span><strong>${score}% ecosystem · ${escapeHtml(WEATHERS[state.weather].name)}</strong></div>
            <div class="inspection-row"><span>Life stages</span><strong>Child to 7 · Adult to 35–40 · Elder thereafter</strong></div>
            <div class="inspection-row"><span>Collapse rule</span><strong>Lose below ${ECOSYSTEM_COLLAPSE_THRESHOLD}% overall or when any indicator reaches 0%</strong></div>
            ${scenario.restoration ? `<div class="inspection-row restoration-crisis-row" data-restoration-crisis><span>Active decline</span><strong>${projectedEcoRate >= 0 ? "+" : ""}${projectedEcoRate.toFixed(1)} ecosystem/day · ${escapeHtml(crisis.label)}</strong></div>
            <div class="inspection-row"><span>Stop the crisis</span><strong>${escapeHtml(scenario.crisisResolution)}</strong></div>` : ""}
            <div class="inspection-row learning-question-row" data-scenario-learning><span>Learning focus</span><strong>${escapeHtml(scenario.learningGoal)}</strong></div>
          </div>
          <span class="eyebrow">SCENARIO GOALS</span>
          <div class="scenario-goals">${scenario.goals.map((goal, index) => `<div class="scenario-goal"><span>${index + 1}</span><span>${escapeHtml(goal.label)}</span></div>`).join("")}</div>
          <div class="scenario-brief-actions">
            <button id="scenarioBackButton" class="secondary-button" type="button">Choose another</button>
            <button id="scenarioBeginButton" class="primary-button" type="button">Take charge of ${escapeHtml(scenario.villageName)}</button>
          </div>
        </section>
      </div>`;
    document.getElementById("scenarioBackButton").addEventListener("click", showStartScreen);
    document.getElementById("scenarioBeginButton").addEventListener("click", () => {
      dom.modalLayer.innerHTML = "";
      modalClosable = false;
      state.paused = false;
      saveGame();
      renderAll();
      showToast(scenario.name, "The existing village is now in your hands.", scenario.icon);
    });
  }

  function showPlacementTutorial(startPlayingAfter = false, returnToMenu = false) {
    showSlideDeck(PLACEMENT_TUTORIAL_STEPS, "BUILDING TUTORIAL", { startPlayingAfter, returnToMenu, finalButton: "Start playing", skipButton: "Skip tutorial" });
  }

  function showBlog(returnToMenu = true, startPlayingAfter = false) {
    showSlideDeck(BLOG_POSTS, "VILLAGE BLOG", {
      returnToMenu,
      startPlayingAfter,
      finalButton: startPlayingAfter ? "Enter village" : "Back to menu",
      skipButton: startPlayingAfter ? "Enter village" : "Close blog"
    });
  }

  function showSlideDeck(slides, label, { startPlayingAfter = false, returnToMenu = false, finalButton = "Done", skipButton = "Close" } = {}) {
    const wasRunning = gameActive && !state.paused;
    state.paused = true;
    let slide = 0;
    modalClosable = false;

    const renderSlide = () => {
      dom.modalLayer.innerHTML = "";
      dom.modalLayer.appendChild(document.getElementById("tutorialTemplate").content.cloneNode(true));
      const data = slides[slide];
      const card = dom.modalLayer.querySelector(".tutorial-card");
      card.querySelector(".tutorial-step-label").textContent = `${label} ${slide + 1} OF ${slides.length}`;
      card.querySelector("h2").textContent = data.title;
      card.querySelector(".tutorial-body").textContent = data.body;
      card.querySelector(".tutorial-tip").textContent = data.tip;
      card.querySelector(".tutorial-illustration").style.backgroundImage = data.art;
      card.querySelector(".tutorial-dots").innerHTML = slides.map((_, index) => `<span class="${index === slide ? "active" : ""}"></span>`).join("");
      const back = card.querySelector(".tutorial-back");
      const next = card.querySelector(".tutorial-next");
      back.style.visibility = slide === 0 ? "hidden" : "visible";
      next.textContent = slide === slides.length - 1 ? finalButton : "Next";
      back.addEventListener("click", () => { slide -= 1; renderSlide(); });
      next.addEventListener("click", () => {
        if (slide < slides.length - 1) {
          slide += 1;
          renderSlide();
        } else {
          finishTutorial();
        }
      });
      card.querySelector(".tutorial-skip").textContent = skipButton;
      card.querySelector(".tutorial-skip").addEventListener("click", finishTutorial);
    };

    const finishTutorial = () => {
      dom.modalLayer.innerHTML = "";
      modalClosable = false;
      if (returnToMenu) {
        openMenu(true);
      } else if (!state.gameOver && (startPlayingAfter || wasRunning)) {
        state.paused = false;
      }
      if (startPlayingAfter) {
        addLog("The Steward’s first plans were laid out. Time begins.", true);
        showToast("The village is yours", "Start with a Cottage, Farm and Well; the building tutorial is always in the menu.", "W");
      }
      renderAll();
    };

    renderSlide();
  }

  function openMenu(preserveResume = false) {
    if (!gameActive) return;
    if (preserveResume) {
      state.paused = true;
      modalClosable = true;
    } else {
      pauseForModal(true);
    }
    const eco = Math.round(ecosystemScore());
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="menuTitle">
          <div class="sheet-heading"><div><span class="eyebrow">PAUSED · ${escapeHtml(getDifficulty().name.toUpperCase())} DIFFICULTY</span><h2 id="menuTitle">${escapeHtml(state.villageName)}</h2></div><button class="sheet-close" type="button" aria-label="Resume">×</button></div>
          <p class="modal-description">Day ${state.day} · ${Math.floor(state.population)} people · ${eco}% ecosystem · ${state.stats.eventsFaced} events faced</p>
          <div class="menu-actions">
            <button id="resumeMenuButton" class="primary-button" type="button">Resume village</button>
            <button id="saveMenuButton" class="secondary-button" type="button">Save now</button>
            <button id="exportMenuButton" class="secondary-button" type="button">Export save</button>
            <button id="importMenuButton" class="secondary-button" type="button">Import save</button>
            <input id="importSaveInput" type="file" accept="application/json,.json" hidden>
            <button id="switchSlotMenuButton" class="secondary-button" type="button">Switch village slot</button>
            <button id="feedbackMenuButton" class="secondary-button" type="button">Send feedback ↗</button>
            ${state.placementTutorialCompleted ? "" : '<button id="tutorialMenuButton" class="secondary-button" type="button">Building tutorial</button>'}
            <button id="blogMenuButton" class="secondary-button" type="button">Village blog</button>
            <button id="fieldGuideMenuButton" class="secondary-button" type="button">Environmental field guide</button>
            <button id="achievementMenuButton" class="secondary-button" type="button">Achievements</button>
            <button id="newMenuButton" class="secondary-button danger-button" type="button">Start a new village</button>
          </div>
        </section>
      </div>`;
    const resume = () => closeModal(true);
    dom.modalLayer.querySelector(".sheet-close").addEventListener("click", resume);
    document.getElementById("resumeMenuButton").addEventListener("click", resume);
    document.getElementById("saveMenuButton").addEventListener("click", () => {
      saveGame();
      showToast("Village saved", "Your progress is stored in this browser.", "✓");
    });
    document.getElementById("exportMenuButton").addEventListener("click", exportSaveFile);
    document.getElementById("importMenuButton").addEventListener("click", () => document.getElementById("importSaveInput").click());
    document.getElementById("importSaveInput").addEventListener("change", event => importSaveFile(event.target.files?.[0]));
    document.getElementById("switchSlotMenuButton").addEventListener("click", showStartScreen);
    document.getElementById("feedbackMenuButton").addEventListener("click", () => {
      window.open("https://forms.gle/9ze39XTDjKvBnmjL9", "_blank", "noopener,noreferrer");
    });
    document.getElementById("tutorialMenuButton")?.addEventListener("click", () => showPlacementTutorial(false, true));
    document.getElementById("blogMenuButton").addEventListener("click", () => showBlog(true));
    document.getElementById("fieldGuideMenuButton").addEventListener("click", () => showFieldGuide(() => openMenu(true)));
    document.getElementById("achievementMenuButton").addEventListener("click", () => showAchievements(() => openMenu(true)));
    document.getElementById("newMenuButton").addEventListener("click", () => {
      if (!window.confirm("Leave this settlement and begin again? Its save will be replaced when the new village starts.")) return;
      showStartScreen();
    });
  }

  function ensureLearningState(target = state) {
    if (!target.learning || typeof target.learning !== "object") target.learning = {};
    target.learning.completedLessons = Array.isArray(target.learning.completedLessons)
      ? [...new Set(target.learning.completedLessons.filter(id => ENVIRONMENT_LESSONS.some(lesson => lesson.id === id)))]
      : [];
    target.learning.quizAnswered = Array.isArray(target.learning.quizAnswered)
      ? [...new Set(target.learning.quizAnswered.filter(id => KNOWLEDGE_QUESTIONS.some(question => question.id === id)))]
      : [];
    target.learning.quizAttempts = Math.max(0, Math.floor(Number(target.learning.quizAttempts) || 0));
    target.learning.guideViews = Math.max(0, Math.floor(Number(target.learning.guideViews) || 0));
    return target.learning;
  }

  function captureLearningProgress() {
    const learning = ensureLearningState();
    for (const lesson of ENVIRONMENT_LESSONS) {
      if (lesson.test() && !learning.completedLessons.includes(lesson.id)) learning.completedLessons.push(lesson.id);
    }
    return learning.completedLessons;
  }

  function getLearningProgress() {
    const completedLessons = captureLearningProgress();
    return ENVIRONMENT_LESSONS.map(lesson => ({ lesson, complete: completedLessons.includes(lesson.id) }));
  }

  function formatEcoDriverRate(value) {
    const precision = Math.abs(value) < 0.01 ? 3 : 2;
    return `${value >= 0 ? "+" : ""}${value.toFixed(precision)}/day`;
  }

  function getEcoCoachInsight() {
    const report = getDailyAverageEcoReport();
    const rates = report.rates;
    const overallRate = Object.values(rates).reduce((sum, rate) => sum + rate, 0) / Object.keys(rates).length;
    const metrics = Object.keys(ECO_LABELS).map(metric => ({
      metric,
      value: state.ecosystem[metric],
      rate: rates[metric]
    }));
    const declining = metrics.filter(item => item.rate < -0.025).sort((a, b) => a.rate - b.rate);
    const focus = declining[0] || metrics.sort((a, b) => a.value - b.value)[0];
    const guide = ECO_COACH_GUIDE[focus.metric];
    const trend = focus.rate < -0.025
      ? `falling ${Math.abs(focus.rate).toFixed(2)} per day`
      : focus.rate > 0.025
        ? `recovering ${focus.rate.toFixed(2)} per day`
        : "currently stable";
    const contributors = report.contributors[focus.metric];
    const pressure = contributors.filter(contributor => contributor.amount < 0).sort((a, b) => a.amount - b.amount)[0] || null;
    const support = contributors.filter(contributor => contributor.amount > 0).sort((a, b) => b.amount - a.amount)[0] || null;
    const systemContext = ECO_SYSTEM_CONTEXT[focus.metric];
    return {
      ...focus,
      ...guide,
      label: ECO_LABELS[focus.metric],
      trend,
      pressure,
      support,
      pressureText: pressure ? `${pressure.source} · ${formatEcoDriverRate(pressure.amount)}` : "No active pressure detected",
      supportText: support ? `${support.source} · ${formatEcoDriverRate(support.amount)}` : "No active recovery detected",
      dayRate: report.day.rates[focus.metric],
      nightRate: report.night.rates[focus.metric],
      overallRate,
      definition: systemContext.definition,
      connection: systemContext.connection,
      text: `${ECO_LABELS[focus.metric]} is ${trend} as a full-day average. ${guide.action}`
    };
  }

  function getLearningContextTip() {
    if (Number(state.buffs.illnessUntil) > getWorldTime()) {
      return "Public-health lesson: illness spreads through shared spaces. Rest, clean water, lower contact and staffed healthcare reduce harm; automatic infrastructure remains valuable when workers are unavailable.";
    }
    const scenario = getActiveScenario();
    const crisis = getScenarioCrisisState(scenario);
    if (crisis.active) {
      return `Restoration emergency: ${crisis.label} is still pushing the ecosystem downward. Stop the cause first: ${scenario.crisisResolution}`;
    }
    const weakest = Object.entries(state.ecosystem).sort((a, b) => a[1] - b[1])[0];
    if (weakest?.[1] < 40) {
      return `Threshold lesson: ${ECO_LABELS[weakest[0]]} is below 40. Low indicators can trigger reinforcing damage elsewhere, so restore the weak link instead of relying on the overall average.`;
    }
    const residentialNoise = getVillageNoiseReport();
    if (residentialNoise.exposedResidents > 0) {
      return `Noise-pollution lesson: ${residentialNoise.exposedResidents} resident${residentialNoise.exposedResidents === 1 ? " is" : "s are"} exposed at home. The full-day average costs ${residentialNoise.moodLoss.toFixed(2)} morale and ${residentialNoise.healthLoss.toFixed(2)} health per day; move loud work at least ${NOISE_POLLUTION_RANGE + 1} tiles from housing or remove the source.`;
    }
    const pollutedCrop = state.buildings
      .filter(building => ["farm", "orchard"].includes(building.type))
      .map(building => ({ building, pollution: getCropPollutionInfo(building) }))
      .sort((a, b) => b.pollution.penalty - a.pollution.penalty)[0];
    if (pollutedCrop?.pollution.penalty >= 0.05) {
      const cropName = BUILDINGS[pollutedCrop.building.type].name;
      return `Environmental-zoning lesson: a ${cropName} is losing ${Math.round(pollutedCrop.pollution.penalty * 100)}% of output to nearby pollution. Distance prevents exposure; it does not erase pollution at the source.`;
    }
    if (isVillagerNight()) {
      return "Night cycle: staffed production and its operational pollution are paused while automatic systems, consumption, weather and natural recovery continue. Resource and Eco Coach /day trends remain full 24-hour averages.";
    }
    const weather = getWeather();
    if (weather.severe) {
      return `${weather.name} lesson: resilience comes from preparing diverse supplies and healthy ecosystems before extreme conditions arrive.`;
    }
    const constrainedResource = ["food", "water", "wood", "stone"].find(resource => state.resources[resource] >= getStorageCapacity(resource) * 0.92);
    if (constrainedResource) {
      return `Waste-prevention lesson: ${constrainedResource} storage is nearly full. More capacity can prevent overflow, but reducing unnecessary production avoids extraction and impact in the first place.`;
    }
    if (state.population >= getHousing() * 0.9) {
      return "Carrying-capacity lesson: housing is almost full. Before inviting growth, compare spare homes, food, water, jobs, storage and the ecosystem’s ability to absorb added demand.";
    }
    const season = getSeason();
    if (season.id === "winter") return "Seasonal lesson: winter lowers harvests, raises fuel demand and freezes waterways. Ice may cover flowing water, so bridges remain the safe crossings.";
    if (season.id === "autumn") return "Seasonal lesson: autumn is a planning window—watch harvest rates, storage and ecosystem recovery before winter.";
    return "Day cycle: staffed workplaces are operating; compare their useful output with the ecological rates they create.";
  }

  function showFieldGuide(returnCallback = null, nested = false) {
    if (!nested && !returnCallback) pauseForModal(true);
    else {
      state.paused = true;
      modalClosable = true;
    }
    const learning = ensureLearningState();
    learning.guideViews += 1;
    const progress = getLearningProgress();
    const completed = progress.filter(item => item.complete).length;
    const coach = getEcoCoachInsight();
    const ecoReport = getDailyAverageEcoReport();
    const quizScore = learning.quizAnswered.length;
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card field-guide-modal" role="dialog" aria-modal="true" aria-labelledby="fieldGuideTitle">
          <div class="sheet-heading">
            <div><span class="eyebrow">LEARN BY WATCHING THE LIVING SYSTEM</span><h2 id="fieldGuideTitle">Environmental field guide</h2></div>
            <button class="sheet-close" type="button" aria-label="Close">×</button>
          </div>
          <p class="modal-description">These principles explain the game’s existing cause-and-effect rules. Complete practical missions in any order; learning progress never changes resources or difficulty.</p>
          <div class="learning-summary-strip">
            <div><strong>24-hour report · ${escapeHtml(coach.label)} ${Math.round(coach.value)}/100</strong><span>${escapeHtml(coach.trend)}. ${escapeHtml(coach.principle)}</span></div>
            <div class="knowledge-score"><b>${quizScore}/${KNOWLEDGE_QUESTIONS.length}</b><small>concepts checked</small></div>
          </div>
          <div class="model-literacy-note" data-learning-model-note>
            <strong>How to read this model</strong>
            <span>The six indicators and /day rates simplify a much more complex reality. Use them to explore feedback and trade-offs; real environmental decisions also require field measurements, local and Indigenous knowledge, uncertainty, and impacts beyond the map.</span>
          </div>
          <section class="systems-snapshot" aria-labelledby="systemsSnapshotTitle">
            <div class="systems-snapshot-heading"><div><span class="eyebrow">CURRENT EVIDENCE</span><h3 id="systemsSnapshotTitle">Six-part systems snapshot</h3></div><small>Modelled 24-hour rates</small></div>
            <div class="systems-snapshot-grid">
              ${Object.keys(ECO_LABELS).map(metric => {
                const value = state.ecosystem[metric];
                const rate = ecoReport.rates[metric];
                const band = value < 40 ? "Critical" : value < 70 ? "Strained" : value < 90 ? "Healthy" : "Thriving";
                return `<article class="system-indicator ${value < 40 ? "critical" : value < 70 ? "strained" : ""}" data-eco-snapshot="${metric}">
                  <div><strong>${escapeHtml(ECO_LABELS[metric])}</strong><span>${Math.round(value)}/100 · ${escapeHtml(band)}</span></div>
                  <b class="${rate < -0.025 ? "negative" : rate > 0.025 ? "positive" : ""}">${escapeHtml(formatEcoDriverRate(rate))}</b>
                  <p>${escapeHtml(ECO_SYSTEM_CONTEXT[metric].definition)}</p>
                </article>`;
              }).join("")}
            </div>
          </section>
          <div class="learning-grid">
            ${progress.map(({ lesson, complete }) => `
              <article class="lesson-card ${complete ? "complete" : ""}" data-lesson="${lesson.id}">
                <div class="lesson-heading"><span class="lesson-icon" aria-hidden="true">${escapeHtml(lesson.icon)}</span><h3>${escapeHtml(lesson.title)}</h3><span class="lesson-status">${complete ? "✓ Observed" : "Try it"}</span></div>
                <p class="lesson-principle">${escapeHtml(lesson.principle)}</p>
                <p class="lesson-context"><strong>Real-world connection:</strong> ${escapeHtml(lesson.realWorld)}</p>
                <p class="lesson-mission"><strong>Field mission:</strong> ${escapeHtml(lesson.mission)}</p>
              </article>`).join("")}
          </div>
          <div class="field-guide-actions">
            <button id="knowledgeCheckButton" class="primary-button" type="button">Take a knowledge check · ${quizScore}/${KNOWLEDGE_QUESTIONS.length}</button>
            <button id="closeFieldGuideButton" class="secondary-button" type="button">Return to village</button>
          </div>
        </section>
      </div>`;
    const exitGuide = () => {
      if (returnCallback) returnCallback();
      else closeModal(true);
    };
    dom.modalLayer.querySelector(".sheet-close").addEventListener("click", exitGuide);
    document.getElementById("closeFieldGuideButton").addEventListener("click", exitGuide);
    document.getElementById("knowledgeCheckButton").addEventListener("click", () => showKnowledgeCheck(returnCallback));
    saveGame();
  }

  function showKnowledgeCheck(returnCallback = null, forcedQuestionIndex = null) {
    const learning = ensureLearningState();
    state.paused = true;
    modalClosable = true;
    const unanswered = KNOWLEDGE_QUESTIONS
      .map((question, index) => ({ question, index }))
      .filter(item => !learning.quizAnswered.includes(item.question.id));
    if (!unanswered.length) {
      dom.modalLayer.innerHTML = `
        <div class="modal-backdrop">
          <section class="sheet-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="quizTitle">
            <div class="sheet-heading"><div><span class="eyebrow">KNOWLEDGE CHECK COMPLETE</span><h2 id="quizTitle">A systems thinker</h2></div><button class="sheet-close" type="button" aria-label="Back to field guide">×</button></div>
            <div class="modal-icon" aria-hidden="true">✓</div>
            <p class="modal-description">You have explained all ${KNOWLEDGE_QUESTIONS.length} environmental concepts. The challenge now is applying them while the village, weather and ecosystem keep changing.</p>
            <button id="quizBackToGuide" class="primary-button" type="button">Back to field guide</button>
          </section>
        </div>`;
      const back = () => showFieldGuide(returnCallback, true);
      dom.modalLayer.querySelector(".sheet-close").addEventListener("click", back);
      document.getElementById("quizBackToGuide").addEventListener("click", back);
      return;
    }

    const selected = Number.isInteger(forcedQuestionIndex)
      ? { question: KNOWLEDGE_QUESTIONS[forcedQuestionIndex], index: forcedQuestionIndex }
      : unanswered[0];
    const question = selected.question;
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card knowledge-modal" role="dialog" aria-modal="true" aria-labelledby="quizTitle">
          <div class="sheet-heading"><div><span class="eyebrow">OPTIONAL · NO GAMEPLAY PENALTY</span><h2 id="quizTitle">Environmental knowledge check</h2></div><button class="sheet-close" type="button" aria-label="Back to field guide">×</button></div>
          <div class="quiz-progress">${escapeHtml(question.topic)} · ${learning.quizAnswered.length}/${KNOWLEDGE_QUESTIONS.length} concepts understood</div>
          <p class="quiz-question">${escapeHtml(question.question)}</p>
          <div class="event-choices quiz-choices">
            ${question.choices.map((choice, index) => `<button class="choice-button quiz-choice" data-answer="${index}" type="button"><span>${escapeHtml(choice)}</span></button>`).join("")}
          </div>
          <div id="quizFeedback" class="quiz-feedback" hidden></div>
          <div id="quizActions" class="field-guide-actions" hidden>
            <button id="quizContinueButton" class="primary-button" type="button">Continue</button>
            <button id="quizGuideButton" class="secondary-button" type="button">Back to field guide</button>
          </div>
        </section>
      </div>`;
    const back = () => showFieldGuide(returnCallback, true);
    dom.modalLayer.querySelector(".sheet-close").addEventListener("click", back);
    document.getElementById("quizGuideButton").addEventListener("click", back);
    dom.modalLayer.querySelectorAll(".quiz-choice").forEach(button => {
      button.addEventListener("click", () => {
        const answer = Number(button.dataset.answer);
        const correct = answer === question.correct;
        learning.quizAttempts += 1;
        if (correct && !learning.quizAnswered.includes(question.id)) learning.quizAnswered.push(question.id);
        dom.modalLayer.querySelectorAll(".quiz-choice").forEach(choiceButton => {
          const choiceIndex = Number(choiceButton.dataset.answer);
          choiceButton.disabled = true;
          choiceButton.classList.toggle("correct", choiceIndex === question.correct);
          choiceButton.classList.toggle("incorrect", choiceIndex === answer && !correct);
        });
        const feedback = document.getElementById("quizFeedback");
        feedback.hidden = false;
        feedback.classList.toggle("correct", correct);
        feedback.textContent = `${correct ? "Correct. " : "Not quite. "}${question.explanation}`;
        const actions = document.getElementById("quizActions");
        actions.hidden = false;
        const continueButton = document.getElementById("quizContinueButton");
        continueButton.textContent = correct ? "Next concept" : "Try this question again";
        continueButton.addEventListener("click", () => showKnowledgeCheck(returnCallback, correct ? null : selected.index), { once: true });
        saveGame();
        renderLearning();
      }, { once: true });
    });
  }

  function showAchievements(returnCallback = null) {
    if (!returnCallback) pauseForModal(true);
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="achievementsTitle">
          <div class="sheet-heading"><div><span class="eyebrow">PERSISTENT ACROSS EVERY VILLAGE</span><h2 id="achievementsTitle">Achievements</h2></div><button class="sheet-close" type="button" aria-label="Close">×</button></div>
          <p class="modal-description">Unlocked achievements remain in this browser even when you begin a new settlement.</p>
          <div class="achievement-grid">
            ${ACHIEVEMENTS.map(def => {
              const unlocked = achievements[def.id];
              const date = unlocked ? new Date(unlocked.unlockedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
              return `<article class="achievement-card ${unlocked ? "" : "locked"}">
                <div class="achievement-medal">${escapeHtml(unlocked ? def.icon : "?")}</div>
                <div><h3>${escapeHtml(def.name)}</h3><p>${escapeHtml(def.description)}</p>${unlocked ? `<time>Unlocked ${escapeHtml(date)} · Day ${unlocked.day}</time>` : ""}</div>
              </article>`;
            }).join("")}
          </div>
        </section>
      </div>`;
    dom.modalLayer.querySelector(".sheet-close").addEventListener("click", () => {
      if (returnCallback) returnCallback();
      else closeModal(true);
    });
  }

  function showChronicle() {
    pauseForModal(true);
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="chronicleTitle">
          <div class="sheet-heading"><div><span class="eyebrow">THE STORY SO FAR</span><h2 id="chronicleTitle">Village chronicle</h2></div><button class="sheet-close" type="button" aria-label="Close">×</button></div>
          <div class="chronicle-full">${state.logs.map(log => `<div class="log-entry ${log.important ? "important" : ""}"><time>Day ${log.day}</time><p>${escapeHtml(log.text)}</p></div>`).join("")}</div>
        </section>
      </div>`;
    dom.modalLayer.querySelector(".sheet-close").addEventListener("click", () => closeModal(true));
  }

  function showGameOver(description) {
    modalClosable = false;
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="gameover-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="gameOverTitle">
          <span class="eyebrow">THE CHRONICLE ENDS · DAY ${state.day}</span>
          <div class="modal-icon" aria-hidden="true">${state.gameOver.reason === "ecosystem" ? "∅" : "◇"}</div>
          <h2 id="gameOverTitle">${state.gameOver.reason === "ecosystem" ? "The forest falls silent" : "The hearth grows cold"}</h2>
          <p class="modal-description">${escapeHtml(description)}</p>
          <div class="gameover-stats">
            <span><small>Days survived</small><strong>${state.day}</strong></span>
            <span><small>Peak population</small><strong>${Math.floor(state.stats.maxPopulation)}</strong></span>
            <span><small>Final ecosystem</small><strong>${Math.round(ecosystemScore())}%</strong></span>
          </div>
          <div class="menu-actions">
            <button id="gameoverNew" class="primary-button" type="button">Begin another village</button>
            <button id="gameoverAchievements" class="secondary-button" type="button">View achievements</button>
          </div>
        </section>
      </div>`;
    document.getElementById("gameoverNew").addEventListener("click", showStartScreen);
    document.getElementById("gameoverAchievements").addEventListener("click", () => showAchievements(() => showGameOver(description)));
  }

  function renderBuildList() {
    if (!dom.buildList || !state) return;
    const category = document.querySelector(".build-tab.active")?.dataset.category || "all";
    const searchTerm = (dom.buildSearch?.value || "").trim().toLocaleLowerCase();
    const visibleTypes = BUILD_ORDER.filter(type => {
      const def = BUILDINGS[type];
      if (!searchTerm && category !== "all" && def.category !== category) return false;
      return !searchTerm || `${def.name} ${def.description} ${def.impactLabel} ${buildingOutputDescription(type)}`.toLocaleLowerCase().includes(searchTerm);
    });
    const nextSignature = `${category}|${searchTerm}|${visibleTypes.map(type => {
      const def = BUILDINGS[type];
      return `${type}:${buildingUnlocked(def) ? 1 : 0}:${canAfford(def.cost) ? 1 : 0}`;
    }).join("|")}`;

    // Keep the existing buttons alive unless affordability, unlocks or the category changed.
    // Replacing hovered buttons every UI tick cancels pointer clicks and restarts CSS fades.
    if (nextSignature === buildListSignature) return;
    buildListSignature = nextSignature;
    dom.buildList.scrollLeft = 0;
    dom.buildList.innerHTML = visibleTypes.length ? visibleTypes
      .map(type => {
        const def = BUILDINGS[type];
        const unlocked = buildingUnlocked(def);
        const affordable = canAfford(def.cost);
        const workerCapacity = getWorkerCapacity(def);
        const schedule = def.bridge
          ? "crossing · no workers"
          : def.automaticProduction !== undefined && workerCapacity
          ? `automatic + ${workerCapacity} optional · up to 2×`
          : def.jobs
            ? `${workerCapacity} worker${workerCapacity === 1 ? "" : "s"} · day shift${def.fullStaffProduction ? " · 2× full" : ""}`
            : "automatic · 24h";
        const costs = `<span class="cost-chip size-chip">${def.size.w}×${def.size.h}</span><span class="cost-chip schedule-chip">${schedule}</span>` + Object.entries(def.cost).map(([resource, amount]) => `<span class="cost-chip">${resource === "wood" ? "▰" : "⬟"} ${amount}</span>`).join("");
        const lock = unlocked ? "" : `<span class="lock-chip">${def.unlockPopulation} citizens</span>`;
        return `<button class="build-item ${selectedBuilding === type ? "selected" : ""} ${affordable ? "" : "unaffordable"}" data-building="${type}" data-category="${def.category}" data-citizens-required="${def.unlockPopulation || 0}" data-jobs="${def.jobs || 0}" data-worker-capacity="${workerCapacity}" data-full-staff-production="${def.fullStaffProduction || 1}" type="button" ${unlocked ? "" : "disabled"}>
          <span class="building-icon" aria-hidden="true">${escapeHtml(def.short)}</span>
          <span class="build-copy">
            <span class="build-name-row"><strong>${escapeHtml(def.name)}</strong>${lock}</span>
            <p>${escapeHtml(def.description)}</p>
            <span class="build-costs">${costs}<span class="impact-chip ${def.impact === "heavy" || def.impact === "medium" ? "harmful" : ""}">${escapeHtml(def.impactLabel)}</span></span>
          </span>
        </button>`;
      }).join("") : `<p class="build-empty">No buildings match “${escapeHtml(searchTerm)}”.</p>`;
  }

  function renderResources() {
    const rates = getDailyAverageProductionRates();
    const housing = getHousing();
    const groups = normaliseDemographics();
    dom.populationValue.textContent = `${Math.floor(state.population)} / ${housing}`;
    const populationCard = document.querySelector('[data-resource="population"]');
    populationCard.title = `${Math.round(groups.children)} children · ${Math.round(groups.adults)} adults · ${Math.round(groups.elders)} elders · Education ${Math.round(state.education)}`;
    populationCard.dataset.children = String(Math.round(groups.children));
    populationCard.dataset.adults = String(Math.round(groups.adults));
    populationCard.dataset.elders = String(Math.round(groups.elders));
    for (const resource of ["food", "water", "wood", "stone"]) {
      const capacity = getStorageCapacity(resource);
      const value = Math.floor(state.resources[resource]);
      dom[`${resource}Value`].textContent = `${value.toLocaleString()}/${capacity.toLocaleString()}`;
      const card = document.querySelector(`[data-resource="${resource}"]`);
      card.dataset.capacity = String(capacity);
      card.title = `${value.toLocaleString()} ${resource === "wood" ? "timber" : resource} stored · ${capacity.toLocaleString()} capacity · trend is a 24-hour average`;
    }
    const marketUnlocked = isCityMarketUnlocked();
    const pendingTrades = Array.isArray(state.cityTrades) ? state.cityTrades.length : 0;
    dom.coinsValue.textContent = Math.floor(state.coins || 0).toLocaleString();
    dom.coinsTrend.textContent = marketUnlocked
      ? pendingTrades ? `${pendingTrades} caravan${pendingTrades === 1 ? "" : "s"} away` : "City market open"
      : "Market locked";
    dom.coinsTrend.className = `trend ${marketUnlocked ? "positive" : ""}`;
    const coinCard = document.querySelector('[data-resource="coins"]');
    coinCard.title = marketUnlocked
      ? `${Math.floor(state.coins || 0).toLocaleString()} coins · no storage limit · ${pendingTrades} city trade${pendingTrades === 1 ? "" : "s"} in transit`
      : "Coins have no storage limit. Build a Village Market to begin city trade.";
    dom.ecosystemValue.textContent = `${Math.round(ecosystemScore())}%`;
    setTrend(dom.populationTrend, rates.population, "/day");
    setResourceTrend(dom.foodTrend, rates.food, "food");
    setResourceTrend(dom.waterTrend, rates.water, "water");
    setResourceTrend(dom.woodTrend, rates.wood, "wood");
    setResourceTrend(dom.stoneTrend, rates.stone, "stone");
    const ecoChange = state.stats.ecoDailyChange;
    dom.ecosystemTrend.textContent = Math.abs(ecoChange) < 0.05 ? "Stable" : `${ecoChange > 0 ? "+" : ""}${ecoChange.toFixed(1)}/day`;
    dom.ecosystemTrend.className = `trend ${ecoChange > 0.05 ? "positive" : ecoChange < -0.05 ? "negative" : ""}`;
  }

  function setTrend(element, value, suffix) {
    element.textContent = `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
    element.className = `trend ${value > 0.05 ? "positive" : value < -0.05 ? "negative" : ""}`;
  }

  function setResourceTrend(element, value, resource) {
    if (value > 0.05 && state.resources[resource] >= getStorageCapacity(resource) - 0.05) {
      element.textContent = "Storage full";
      element.className = "trend full";
      return;
    }
    setTrend(element, value, "/day");
  }

  function renderCalendar() {
    const season = getSeason();
    const weather = getWeather();
    const clockFraction = (0.25 + state.dayProgress) % 1;
    const totalMinutes = Math.floor(clockFraction * 24 * 60);
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    dom.dayLabel.textContent = `Day ${state.day} · ${season.name}`;
    dom.seasonIcon.textContent = season.icon;
    dom.clockLabel.textContent = `${hours}:${minutes}`;
    const remainingWeather = Math.max(0, Number(state.nextWeatherChange) - getWorldTime());
    dom.weatherLabel.textContent = `${weather.icon} ${weather.name} · ${formatWeatherDuration(remainingWeather)}`;
    const currentProfile = WEATHERS[state.weather]?.duration;
    dom.weatherLabel.title = currentProfile
      ? `Realistic duration: ${formatWeatherDuration(currentProfile.minDays).replace(" left", "")}–${formatWeatherDuration(currentProfile.maxDays).replace(" left", "")}`
      : "Weather duration";
    dom.villageName.textContent = state.villageName;
    dom.pauseButton.textContent = state.paused ? "▶" : "Ⅱ";
    dom.pauseButton.setAttribute("aria-label", state.paused ? "Resume time" : "Pause time");
    document.querySelectorAll(".speed-button").forEach(button => button.classList.toggle("active", !state.paused && Number(button.dataset.speed) === state.speed));
  }

  function renderEcosystem() {
    const score = ecosystemScore();
    dom.ecoRingValue.textContent = Math.round(score);
    dom.ecoRing.style.setProperty("--eco-angle", `${score}%`);
    let status = "Thriving";
    let statusClass = "thriving";
    let summary = "The forest is resilient. Thoughtful growth will help it stay that way.";
    if (score < 75) {
      status = "Strained";
      statusClass = "strained";
      summary = "The living system is under pressure. Find the weakest indicators and reduce their causes.";
    }
    if (score < 40) {
      status = "Critical";
      statusClass = "critical";
      summary = "Collapse is becoming self-reinforcing. Restore water, habitat and soil immediately.";
    }
    if (score < 15) {
      status = "Collapsing";
      statusClass = "critical";
      summary = "The ecosystem is close to death. The village may have only days left.";
    }
    const weakest = Object.entries(state.ecosystem).sort((a, b) => a[1] - b[1])[0];
    if (weakest && weakest[1] <= 10) {
      status = "Weak link at risk";
      statusClass = "critical";
      summary = `${ECO_LABELS[weakest[0]]} is at ${Math.round(weakest[1])}%. If any indicator reaches 0%, the village is lost even when the overall average is higher.`;
    }
    dom.ecoBadge.textContent = status;
    dom.ecoBadge.className = `eco-badge ${statusClass}`;
    dom.ecoSummary.textContent = summary;
    dom.ecoMetrics.innerHTML = Object.entries(state.ecosystem).map(([metric, value]) => `
      <div class="eco-metric-row">
        <span>${escapeHtml(ECO_LABELS[metric])}</span>
        <div class="eco-metric-track"><div class="eco-metric-fill ${value < 25 ? "danger" : value < 55 ? "warn" : ""}" style="width:${value}%"></div></div>
        <strong>${Math.round(value)}</strong>
      </div>`).join("");
  }

  function renderLearning() {
    const learning = ensureLearningState();
    const progress = getLearningProgress();
    const completed = progress.filter(item => item.complete).length;
    const coach = getEcoCoachInsight();
    const contextTip = getLearningContextTip();
    dom.learningProgress.textContent = `${completed}/${ENVIRONMENT_LESSONS.length} lessons`;
    dom.ecoCoachIcon.textContent = coach.icon;
    dom.ecoCoachMetric.textContent = `${coach.label} · ${Math.round(coach.value)}/100`;
    dom.ecoCoachText.textContent = `${contextTip} ${coach.text}`;
    dom.ecoCoachPressure.textContent = coach.pressureText;
    dom.ecoCoachSupport.textContent = coach.supportText;
    dom.ecoCoachConnection.textContent = `System connection: ${coach.connection}`;
    dom.gameCanvas.dataset.learningLessonsComplete = String(completed);
    dom.gameCanvas.dataset.learningLessonCount = String(ENVIRONMENT_LESSONS.length);
    dom.gameCanvas.dataset.learningQuestionCount = String(KNOWLEDGE_QUESTIONS.length);
    dom.gameCanvas.dataset.learningQuizCorrect = String(learning.quizAnswered.length);
    dom.gameCanvas.dataset.learningQuizAttempts = String(learning.quizAttempts);
    dom.gameCanvas.dataset.ecoCoachMetric = coach.metric;
    dom.gameCanvas.dataset.ecoCoachRate = coach.rate.toFixed(3);
    dom.gameCanvas.dataset.ecosystemDailyForecast = coach.overallRate.toFixed(3);
    dom.gameCanvas.dataset.ecoCoachPressure = coach.pressure?.source || "none";
    dom.gameCanvas.dataset.ecoCoachSupport = coach.support?.source || "none";
    dom.gameCanvas.dataset.ecoCoachDriverCount = String((coach.pressure ? 1 : 0) + (coach.support ? 1 : 0));
    dom.gameCanvas.dataset.ecoCoachDayRate = coach.dayRate.toFixed(3);
    dom.gameCanvas.dataset.ecoCoachNightRate = coach.nightRate.toFixed(3);
    dom.gameCanvas.dataset.ecoCoachRateDisplay = "24-hour-average";
    dom.gameCanvas.dataset.learningContext = isVillagerNight() ? "night-cycle" : getWeather().severe ? "extreme-weather" : `${getSeason().id}-day`;
  }

  function renderObjectives() {
    const scenario = getActiveScenario();
    if (scenario) {
      const statuses = scenario.goals.map(goal => goal.test());
      const crisis = getScenarioCrisisState(scenario);
      dom.objectiveProgress.textContent = state.scenarioCompleted ? "Complete" : `${statuses.filter(Boolean).length}/${statuses.length}`;
      dom.objectiveIntro.textContent = state.scenarioCompleted
        ? "Scenario complete. Keep this village alive for as long as you can."
        : scenario.restoration
          ? crisis.active
            ? `${scenario.brief} Active crisis: ${scenario.crisisResolution}`
            : "The continuing crisis has been stopped. Restore the damaged indicators and complete the remaining goals."
          : scenario.brief;
      dom.objectiveList.innerHTML = scenario.goals.map((goal, index) => `
        <div class="objective-item ${statuses[index] ? "done" : ""}">
          <span class="objective-check">${statuses[index] ? "✓" : ""}</span><span>${escapeHtml(goal.label)}</span>
        </div>`).join("");
      dom.objectiveList.closest(".objective-card").querySelector("h3").textContent = scenario.name;
      return;
    }
    normaliseObjectiveProgress(state);
    const chapter = OBJECTIVE_CHAPTERS[state.objectiveChapter];
    if (!chapter) return;
    dom.gameCanvas.dataset.objectiveChapterCount = String(OBJECTIVE_CHAPTERS.length);
    dom.gameCanvas.dataset.objectiveChapter = String(state.objectiveChapter);
    dom.gameCanvas.dataset.finalObjectiveTitle = OBJECTIVE_CHAPTERS.at(-1).title;
    dom.gameCanvas.dataset.finalObjectiveGoals = OBJECTIVE_CHAPTERS.at(-1).goals.map(goal => goal.label).join("|");
    const completedFinal = state.completedObjectives.includes(state.objectiveChapter);
    const statuses = chapter.goals.map(goal => goal.test());
    dom.objectiveProgress.textContent = completedFinal ? "Complete" : `${statuses.filter(Boolean).length}/${statuses.length}`;
    dom.objectiveIntro.textContent = completedFinal ? "Every formal path is complete. Now survive for as long as you can." : chapter.intro;
    dom.objectiveList.innerHTML = chapter.goals.map((goal, index) => `
      <div class="objective-item ${statuses[index] ? "done" : ""}">
        <span class="objective-check">${statuses[index] ? "✓" : ""}</span><span>${escapeHtml(goal.label)}</span>
      </div>`).join("");
    const heading = dom.objectiveList.closest(".objective-card").querySelector("h3");
    heading.textContent = chapter.title;
  }

  function renderPlacementGuide() {
    if (!dom.placementGuide) return;
    const steps = [
      { type: "cottage", title: "Place a Cottage", text: "Select Cottage, then click a clear 2 × 2 area near the Founders’ Hearth. Keep it away from the future noisy work sites.", why: "Homes give arriving families somewhere to live. Without housing, population growth stalls and you cannot fill the jobs that keep food and materials flowing.", action: "Select Cottage", preferred: [45, 47] },
      { type: "farm", title: "Place a Field Farm", text: "Select Field Farm, then place its 4 × 3 footprint on clear land away from pollution. Two farmers provide normal food output.", why: "Farms turn workers and water into food every day. A village can only grow safely when its food supply stays ahead of its residents’ needs.", action: "Select Field Farm", preferred: [54, 46] },
      { type: "well", title: "Place a Village Well", text: "Select Village Well, then click one clear tile near your homes and Farm. It works automatically and supplies water.", why: "Water keeps residents healthy and lets Farms produce food. A shortage quickly turns an otherwise successful expansion into a crisis.", action: "Select Village Well", preferred: [47, 55] },
      { type: "lumber", title: "Place a Logging Camp", text: "Select Logging Camp, then place its 3 × 2 footprint beside the forest. Keep Cottages outside its purple noise area; its circle should cover trees.", why: "Timber pays for most early construction, but logging also removes habitat and adds noise. Its location teaches the central trade-off: grow the village while protecting the living systems that support it.", action: "Select Logging Camp", preferred: [39, 49] },
      { type: "quarry", title: "Place a Stone Quarry", text: "Select Stone Quarry, then place its 4 × 3 footprint at the clearing’s edge, well away from homes, Farms and waterways.", why: "Stone enables larger, sturdier projects, yet quarry dust and noise can harm nearby homes, crops and soil. Keeping industry separate preserves future options for the village.", action: "Select Stone Quarry", preferred: [57, 55] },
      { type: "storage", title: "Place a Storehouse", text: "Select Storehouse, then place its 2 × 2 footprint near supplies. It adds 200 storage to every main resource and needs no workers.", why: "Without spare storage, food, water, timber and stone produced above their limits disappear. Storage lets you save surpluses for building projects, bad weather and emergencies.", action: "Select Storehouse", preferred: [48, 57] },
      { type: "sanctuary", title: "Place a Wild Sanctuary", text: "Select Wild Sanctuary, then place its 4 × 4 footprint next to remaining forest, far from pollution and noise. It restores wildlife and biodiversity.", why: "A Sanctuary reconnects habitat and helps repay the ecological pressure caused by homes, farming and industry. Healthy ecosystems make long-term growth more resilient.", action: "Select Wild Sanctuary", preferred: [56, 56] }
    ];
    const stepIndex = steps.findIndex(step => !countBuilding(step.type));
    if (!getActiveScenario() && !state.placementTutorialCompleted && stepIndex < 0) {
      completePlacementTutorial();
      return;
    }
    const active = !getActiveScenario() && !state.placementTutorialCompleted && stepIndex >= 0;
    dom.placementGuide.hidden = !active;
    if (!active) {
      tutorialSuggestedPlacement = null;
      return;
    }
    const step = steps[stepIndex];
    dom.placementGuideStep.textContent = `LIVE BUILD TUTORIAL · STEP ${stepIndex + 1} OF ${steps.length}`;
    dom.placementGuideTitle.textContent = step.title;
    dom.placementGuideText.textContent = step.text;
    dom.placementGuideWhy.innerHTML = `<strong>Why it matters:</strong> ${escapeHtml(step.why)}`;
    const site = findTidyTutorialPlacement(state, step.type, step.preferred[0], step.preferred[1]);
    const size = getBuildingSize(step.type);
    tutorialSuggestedPlacement = site ? { type: step.type, x: site.x, y: site.y, w: size.w, h: size.h } : null;
    dom.placementGuideSpot.textContent = site
      ? `Recommended spot: move your cursor to map tile ${site.x + Math.floor(size.w / 2) + 1}, ${site.y + Math.floor(size.h / 2) + 1}. It is clear, outside pollution zones, and keeps the layout compact.`
      : "Recommended spot: look for clear land outside every pollution and noise zone; the footprint preview must be fully green.";
    dom.placementGuideAction.textContent = step.action;
    dom.placementGuideAction.onclick = () => selectBuilding(step.type);
    dom.placementGuideSkip.onclick = () => completePlacementTutorial(true);
  }

  function completePlacementTutorial(skipped = false) {
    if (state.placementTutorialCompleted) return;
    state.placementTutorialCompleted = true;
    tutorialSuggestedPlacement = null;
    saveGame();
    pauseForModal(true);
    dom.modalLayer.innerHTML = `
      <div class="modal-backdrop">
        <section class="sheet-modal modal-card tutorial-complete-card" role="dialog" aria-modal="true" aria-labelledby="tutorialCompleteTitle">
          <span class="eyebrow">${skipped ? "BUILD TUTORIAL SKIPPED" : "BUILD TUTORIAL COMPLETE"}</span>
          <h2 id="tutorialCompleteTitle">The next chapter is yours</h2>
          <p>${skipped ? "You can begin planning in your own order." : "You now have the foundations of a balanced village."} Expand gradually: add homes as families arrive, then keep food, water and storage ahead of demand. Place timber and stone work at the edge of the clearing, and pair growth with protected green space.</p>
          <p>Use the resource bars, building inspections and ecosystem forecasts to guide each next step. Good luck, Steward.</p>
          <button id="tutorialCompleteButton" class="primary-button" type="button">Begin village</button>
        </section>
      </div>`;
    document.getElementById("tutorialCompleteButton").addEventListener("click", () => closeModal(true));
    renderAll();
  }

  function renderLog() {
    dom.eventLog.innerHTML = state.logs.slice(0, 4).map(log => `
      <div class="log-entry ${log.important ? "important" : ""}"><time>Day ${log.day}</time><p>${escapeHtml(log.text)}</p></div>`).join("");
  }

  function renderFooter() {
    const jobs = getJobs();
    const workers = getWorkers();
    const available = Math.max(0, workers - jobs);
    const workText = jobs > workers ? `${jobs} jobs · ${jobs - workers} unfilled` : `${jobs} jobs · ${available} available`;
    const children = Math.round(state.demographics.children);
    const schoolPlaces = getSchoolCapacity();
    const schoolText = schoolPlaces ? `${Math.min(children, schoolPlaces)}/${schoolPlaces}` : "none";
    const residentialNoise = getVillageNoiseReport();
    const noiseText = residentialNoise.exposedResidents ? `${residentialNoise.exposedResidents} noise-exposed` : "Noise buffered";
    dom.workersLabel.textContent = `${workers} workers · ${workText}`;
    dom.familiesLabel.textContent = `${children} children · School ${schoolText} · Education ${Math.round(state.education)} · Health ${Math.round(state.health)} · Morale ${Math.round(state.happiness)} · ${noiseText}`;
    dom.familiesLabel.title = residentialNoise.exposedResidents
      ? `Residential noise: -${residentialNoise.moodLoss.toFixed(2)} morale/day and -${residentialNoise.healthLoss.toFixed(2)} health/day as a full 24-hour average`
      : `No occupied housing is exposed to active noise within ${NOISE_POLLUTION_RANGE} tiles`;
    const industrialWeight = countBuilding("lumber") + countBuilding("quarry") * 1.3 + countBuilding("workshop") * 1.6 + countBuilding("hunter") * 0.8;
    const builtArea = state.buildings.reduce((sum, building) => sum + building.w * building.h, 0);
    const footprint = clamp(Math.max(0, builtArea - 9) * 0.7 + state.population * 0.34 + industrialWeight * 3, 0, 100);
    let label = "Gentle";
    if (footprint >= 25) label = "Growing";
    if (footprint >= 50) label = "Heavy";
    if (footprint >= 75) label = "Severe";
    dom.footprintLabel.textContent = label;
    dom.footprintFill.style.width = `${footprint}%`;
    dom.footprintFill.style.background = footprint > 70 ? "linear-gradient(90deg,#d98754,#e56d65)" : footprint > 45 ? "linear-gradient(90deg,#7ebc71,#e4bd65)" : "";
  }

  function updateSelectionUi() {
    document.querySelectorAll(".tool-button").forEach(button => button.classList.toggle("active", !selectedBuilding && button.dataset.tool === activeTool));
    dom.treePriorityTool?.setAttribute("aria-pressed", String(activeTool === "tree_priority"));
    document.querySelectorAll(".build-item").forEach(button => button.classList.toggle("selected", button.dataset.building === selectedBuilding));
    if (selectedBuilding) {
      const def = BUILDINGS[selectedBuilding];
      const size = getBuildingSize(selectedBuilding, selectedRotation);
      const direction = ["N", "E", "S", "W"][selectedRotation];
      dom.selectionLabel.textContent = `${def.name} · ${size.w}×${size.h} · ${direction} · O/P rotate`;
      dom.selectionSwatch.textContent = def.short;
      dom.selectionSwatch.className = "selection-swatch";
      dom.gameCanvas.style.cursor = "cell";
    } else if (activeTool === "demolish") {
      dom.selectionLabel.textContent = "Destroy building · 50% refund";
      dom.selectionSwatch.textContent = "⌁";
      dom.selectionSwatch.className = "selection-swatch";
      dom.gameCanvas.style.cursor = "not-allowed";
    } else if (activeTool === "tree_priority") {
      dom.selectionLabel.textContent = "Multi-select tree priority · click or drag to mark/remove";
      dom.selectionSwatch.textContent = "⌖";
      dom.selectionSwatch.className = "selection-swatch inspect-swatch";
      dom.gameCanvas.style.cursor = "copy";
    } else {
      dom.selectionLabel.textContent = "Inspect tool";
      dom.selectionSwatch.textContent = "⌕";
      dom.selectionSwatch.className = "selection-swatch inspect-swatch";
      dom.gameCanvas.style.cursor = "crosshair";
    }
  }

  function updateWorldDataAttributes() {
    dom.gameCanvas.dataset.activeSaveSlot = String(activeSaveSlot);
    dom.gameCanvas.dataset.maxSaveSlots = String(MAX_SAVE_SLOTS);
    dom.gameCanvas.dataset.cityMarketUnlocked = String(isCityMarketUnlocked());
    dom.gameCanvas.dataset.coins = String(Math.floor(state.coins || 0));
    dom.gameCanvas.dataset.cityTradesInTransit = String(Array.isArray(state.cityTrades) ? state.cityTrades.length : 0);
    const cropSites = state.buildings.filter(building => ["farm", "orchard"].includes(building.type));
    const farms = state.buildings.filter(building => building.type === "farm");
    const rainGardens = state.buildings.filter(building => building.type === "rain_garden");
    const polluters = state.buildings.filter(building => BUILDINGS[building.type]?.pollution);
    const noiseSources = state.buildings.filter(building => BUILDINGS[building.type]?.noise);
    const loggingCamps = state.buildings.filter(building => building.type === "lumber");
    const bridges = state.buildings.filter(building => BUILDINGS[building.type]?.bridge);
    const staffableBuildings = state.buildings.filter(building => getWorkerCapacity(BUILDINGS[building.type]) > 0);
    const waterwayTypes = Object.values(state.waterways || {});
    const waterwaysFrozen = areWaterwaysFrozen();
    const burnedTreeIndices = Object.keys(state.burnedTrees || {}).map(Number).filter(Number.isInteger);
    const standingWildTrees = getStandingWildTreeCount();
    const rawProducers = state.buildings.filter(building => ["lumber", "quarry"].includes(building.type));
    const currentProductionRates = getProductionRates();
    const productionRates = getDailyAverageProductionRates();
    const staffedWorkActive = !isVillagerNight();
    const dailyNoise = getVillageNoiseReport();
    const dayNoise = getVillageNoiseReport(state, true);
    const nightNoise = getVillageNoiseReport(state, false);
    const currentNoise = staffedWorkActive ? dayNoise : nightNoise;
    const worstCropPenalty = cropSites.reduce((worst, crop) => Math.max(worst, getCropPollutionInfo(crop).penalty), 0);
    const forestPenalty = polluters.reduce((sum, building) => sum + getForestPollutionInfo(building).penalty, 0);
    dom.gameCanvas.dataset.namedPeople = String(state.people.length);
    dom.gameCanvas.dataset.loggedTrees = String(Object.keys(state.loggedTrees || {}).length);
    dom.gameCanvas.dataset.loggingStumpsInRange = String(loggingCamps.reduce((sum, building) => sum + getLoggingStumpsInRange(building).length, 0));
    dom.gameCanvas.dataset.clearedForestTiles = String(Object.keys(state.clearedTiles || {}).length);
    dom.gameCanvas.dataset.stumpsRemoved = String(state.stats.stumpsRemoved || 0);
    dom.gameCanvas.dataset.fireScarTilesCleared = String(state.stats.fireScarTilesCleared || 0);
    dom.gameCanvas.dataset.waterwaysInitialised = String(state.waterwaysInitialised === true);
    dom.gameCanvas.dataset.riverTiles = String(waterwayTypes.filter(type => type === "river").length);
    dom.gameCanvas.dataset.riverDry = String(areScenarioWaterwaysDry());
    dom.gameCanvas.dataset.creeksDry = String(areScenarioWaterwaysDry());
    dom.gameCanvas.dataset.dryRiverRefillAt = String(getActiveScenario()?.dryRiverRefillAt || "");
    dom.gameCanvas.dataset.dryRiverGushDelayHours = String(DRY_RIVER_GUSH_DELAY_DAYS * 24);
    dom.gameCanvas.dataset.dryRiverFlowProgress = getDryRiverFlowProgress().toFixed(3);
    dom.gameCanvas.dataset.creekTiles = String(waterwayTypes.filter(type => type === "creek").length);
    dom.gameCanvas.dataset.waterwaysFrozen = String(waterwaysFrozen);
    dom.gameCanvas.dataset.frozenRiverTiles = String(waterwaysFrozen ? waterwayTypes.filter(type => type === "river").length : 0);
    dom.gameCanvas.dataset.frozenCreekTiles = String(waterwaysFrozen ? waterwayTypes.filter(type => type === "creek").length : 0);
    dom.gameCanvas.dataset.winterIceMovementRule = "blocked-unless-bridge";
    dom.gameCanvas.dataset.winterIceVisual = "static-seams-and-cracks";
    dom.gameCanvas.dataset.bridgeCount = String(bridges.length);
    dom.gameCanvas.dataset.creekBridgeCount = String(bridges.filter(building => building.type === "creek_bridge").length);
    dom.gameCanvas.dataset.riverBridgeCount = String(bridges.filter(building => building.type === "river_bridge").length);
    dom.gameCanvas.dataset.bridgeWalkableTiles = String(bridges.reduce((total, building) => total + building.w * building.h, 0));
    dom.gameCanvas.dataset.waterMovementRule = "blocked-unless-bridge";
    dom.gameCanvas.dataset.bridgePlacementRule = "matching-water-between-cleared-banks";
    dom.gameCanvas.dataset.buildOrderRule = "citizens-required-then-alphabetical";
    dom.gameCanvas.dataset.buildOrder = BUILD_ORDER.join(",");
    dom.gameCanvas.dataset.workplacePriorityRule = "required-jobs-first,then-high-normal-low,then-optional-helpers";
    dom.gameCanvas.dataset.citizenPriorityRule = "high-normal-low,then-adults-before-elders";
    for (const level of WORK_PRIORITY_LEVELS) {
      const label = level.label;
      dom.gameCanvas.dataset[`workplaces${label}Priority`] = String(staffableBuildings.filter(building => normaliseWorkPriority(building.staffingPriority) === level.id).length);
      dom.gameCanvas.dataset[`citizens${label}Priority`] = String(state.people.filter(person => normaliseWorkPriority(person.workPriority) === level.id).length);
      dom.gameCanvas.dataset[`workingCitizens${label}Priority`] = String(state.people.filter(person => person.workBuildingId && normaliseWorkPriority(person.workPriority) === level.id).length);
    }
    dom.gameCanvas.dataset.loggingTreesInRange = String(loggingCamps.reduce((sum, building) => sum + getLoggingTreesInRange(building).length, 0));
    dom.gameCanvas.dataset.loggingFarmSupply = String(loggingCamps.reduce((sum, building) => sum + getMatureWoodFarmSupply(building).length, 0));
    dom.gameCanvas.dataset.loggingManagedTargets = String(loggingCamps.filter(building => getLoggingTarget(building)?.kind === "farm").length);
    dom.gameCanvas.dataset.loggingTargetOrder = "priority-stump,priority-tree,ordinary-stumps,mature-managed-tree,local-wild-tree,nearest-outside-zone-wild-tree";
    dom.gameCanvas.dataset.loggingStopped = String(loggingCamps.filter(building => getLoggingAccessFactor(building) <= 0 || isLoggingStorageBlocked(building)).length);
    dom.gameCanvas.dataset.stumpPriorityCamps = String(loggingCamps.filter(building => !isLoggingStorageBlocked(building) && getAssignedWorkers(building.id) > 0 && getLoggingWorkStumps(building).length > 0 && !getLoggingTarget(building)?.priority).length);
    dom.gameCanvas.dataset.priorityTreesOverrideStumps = String(loggingCamps.filter(building => !isLoggingStorageBlocked(building) && !getPriorityStumpForCamp(building) && getLoggingWorkStumps(building).some(stump => !stump.priority) && getLoggingTarget(building)?.priority).length);
    dom.gameCanvas.dataset.priorityStumpsOverrideTrees = String(loggingCamps.filter(building => !isLoggingStorageBlocked(building) && Boolean(getPriorityStumpForCamp(building)) && Boolean(getLoggingTarget(building)?.priority)).length);
    dom.gameCanvas.dataset.activeLoggingFellers = String(staffedWorkActive ? loggingCamps.reduce((sum, building) => {
      const target = getLoggingTarget(building);
      return sum + (!isLoggingStorageBlocked(building) && !getPriorityStumpForCamp(building) && (target?.priority || !getLoggingWorkStumps(building).length) ? getAssignedWorkers(building.id) : 0);
    }, 0) : 0);
    dom.gameCanvas.dataset.priorityTrees = String(getPrioritizedTrees().length);
    dom.gameCanvas.dataset.treesPrioritized = String(state.stats.treesPrioritized || 0);
    dom.gameCanvas.dataset.treesUnprioritized = String(state.stats.treesUnprioritized || 0);
    dom.gameCanvas.dataset.treePriorityAction = "hold-to-toggle-or-priority-tool-click-and-drag-to-mark-or-remove";
    dom.gameCanvas.dataset.priorityTreesFelled = String(state.stats.priorityTreesFelled || 0);
    dom.gameCanvas.dataset.priorityStumps = String(getPriorityStumps().length);
    dom.gameCanvas.dataset.priorityStumpsRemoved = String(state.stats.priorityStumpsRemoved || 0);
    dom.gameCanvas.dataset.remoteLoggingStumps = String(Object.keys(state.remoteStumps || {}).length);
    dom.gameCanvas.dataset.inRangeLoggingMultiplier = String(IN_RANGE_LOGGING_MULTIPLIER);
    dom.gameCanvas.dataset.activeLoggingMultiplier = String(staffedWorkActive ? loggingCamps.reduce((fastest, building) => {
      const target = getLoggingTarget(building);
      return Math.max(fastest, !isLoggingStorageBlocked(building) && target ? target.inRange ? IN_RANGE_LOGGING_MULTIPLIER : 1 : 0);
    }, 0) : 0);
    dom.gameCanvas.dataset.woodFarmPlots = String(state.buildings.filter(building => building.type === "wood_farm").length * WOOD_FARM_PLOTS);
    dom.gameCanvas.dataset.matureWoodFarmTrees = String(state.buildings.filter(building => building.type === "wood_farm").reduce((sum, building) => sum + getMatureWoodFarmPlots(building).length, 0));
    dom.gameCanvas.dataset.woodFarmTreesHarvested = String(state.stats.woodFarmTreesHarvested || 0);
    dom.gameCanvas.dataset.treeTimberMin = String(TREE_TIMBER_MIN);
    dom.gameCanvas.dataset.treeTimberMax = String(TREE_TIMBER_MAX);
    dom.gameCanvas.dataset.standingWildTrees = String(standingWildTrees);
    dom.gameCanvas.dataset.wildTreesPerAirBonus = "50";
    dom.gameCanvas.dataset.wildTreeAirBonus = (Math.floor(standingWildTrees / 50) * 0.02).toFixed(2);
    dom.gameCanvas.dataset.burnedTreeCount = String(burnedTreeIndices.length);
    dom.gameCanvas.dataset.standingBurnedTrees = String(burnedTreeIndices.filter(index => isStandingTree(index % WORLD_SIZE, Math.floor(index / WORLD_SIZE))).length);
    dom.gameCanvas.dataset.burnedTreeShare = String(AFTER_FIRE_BURNED_TREE_SHARE);
    dom.gameCanvas.dataset.burnedTreeTimberMultiplier = String(BURNED_TREE_TIMBER_MULTIPLIER);
    dom.gameCanvas.dataset.burnedTreeTimberReductionPercent = String(Math.round((1 - BURNED_TREE_TIMBER_MULTIPLIER) * 100));
    dom.gameCanvas.dataset.burnedTreeLeafState = "permanent-leafless";
    dom.gameCanvas.dataset.burnedTreeColour = "black";
    dom.gameCanvas.dataset.treeFellingBaseRate = String(BASE_TREE_FELLING_RATE);
    dom.gameCanvas.dataset.outsideTreeFellingBaseHours = String(OUTSIDE_TREE_FELLING_HOURS);
    dom.gameCanvas.dataset.insideTreeFellingBaseHours = String(OUTSIDE_TREE_FELLING_HOURS / IN_RANGE_LOGGING_MULTIPLIER);
    dom.gameCanvas.dataset.standardLoggingCrew = String(STANDARD_LOGGING_CREW);
    dom.gameCanvas.dataset.nextTreeTimberYield = String(loggingCamps.reduce((yieldAmount, building) => yieldAmount || getLoggingTargetTimberYield(getLoggingTarget(building)), 0));
    dom.gameCanvas.dataset.projectedLoggingTimberRate = loggingCamps.reduce((sum, building) => sum + getProjectedLoggingTimberRate(building), 0).toFixed(4);
    dom.gameCanvas.dataset.treeTimberYielded = String(state.stats.treeTimberYielded || 0);
    dom.gameCanvas.dataset.treeTimberStored = String(state.stats.treeTimberStored || 0);
    dom.gameCanvas.dataset.lastTreeTimberYield = String(state.stats.lastTreeTimberYield || 0);
    dom.gameCanvas.dataset.timberStorageFull = String(isTimberStorageFull());
    dom.gameCanvas.dataset.storageBlockedLoggingCamps = String(loggingCamps.filter(building => isLoggingStorageBlocked(building)).length);
    dom.gameCanvas.dataset.loggingFullStorageOverrides = String(loggingCamps.filter(building => building.workWhenStorageFull === true).length);
    dom.gameCanvas.dataset.storageCapacityFood = String(getStorageCapacity("food"));
    dom.gameCanvas.dataset.storageCapacityWater = String(getStorageCapacity("water"));
    dom.gameCanvas.dataset.storageCapacityWood = String(getStorageCapacity("wood"));
    dom.gameCanvas.dataset.storageCapacityStone = String(getStorageCapacity("stone"));
    dom.gameCanvas.dataset.cropPollutionLoss = String(Math.round(worstCropPenalty * 100));
    dom.gameCanvas.dataset.forestPollution = forestPenalty.toFixed(1);
    dom.gameCanvas.dataset.noisePollutionRange = String(NOISE_POLLUTION_RANGE);
    dom.gameCanvas.dataset.windmillNoisePollutionRange = String(getNoisePollutionRange("windmill"));
    dom.gameCanvas.dataset.noisePollutionTargets = "occupied-housing";
    dom.gameCanvas.dataset.noiseSourceCount = String(noiseSources.length);
    dom.gameCanvas.dataset.activeNoiseSources = String(currentNoise.activeSourceCount);
    dom.gameCanvas.dataset.noiseExposedHomes = String(dailyNoise.exposedHomes);
    dom.gameCanvas.dataset.noiseExposedResidents = String(dailyNoise.exposedResidents);
    dom.gameCanvas.dataset.noiseMoodLossDaily = dailyNoise.moodLoss.toFixed(4);
    dom.gameCanvas.dataset.noiseHealthLossDaily = dailyNoise.healthLoss.toFixed(4);
    dom.gameCanvas.dataset.noiseDayMoodLoss = dayNoise.moodLoss.toFixed(4);
    dom.gameCanvas.dataset.noiseNightMoodLoss = nightNoise.moodLoss.toFixed(4);
    dom.gameCanvas.dataset.weather = state.weather;
    dom.gameCanvas.dataset.weatherFrom = state.weatherFrom;
    dom.gameCanvas.dataset.weatherBlend = Number(state.weatherBlend).toFixed(4);
    dom.gameCanvas.dataset.nextWeatherChange = Number(state.nextWeatherChange).toFixed(4);
    dom.gameCanvas.dataset.weatherStartedAt = Number(state.weatherStartedAt).toFixed(4);
    dom.gameCanvas.dataset.weatherDurationDays = Number(state.weatherDurationDays).toFixed(4);
    dom.gameCanvas.dataset.weatherRemainingDays = Math.max(0, Number(state.nextWeatherChange) - getWorldTime()).toFixed(4);
    dom.gameCanvas.dataset.weatherFadeDays = getWeatherFadeDuration().toFixed(4);
    dom.gameCanvas.dataset.weatherConditionCount = String(Object.keys(WEATHERS).length);
    dom.gameCanvas.dataset.stormTypicalHours = String(WEATHERS.storm.duration.typicalDays * 24);
    dom.gameCanvas.dataset.cloudyTypicalDays = String(WEATHERS.cloudy.duration.typicalDays);
    dom.gameCanvas.dataset.heatwaveTypicalDays = String(WEATHERS.heatwave.duration.typicalDays);
    dom.gameCanvas.dataset.weatherVisualTime = Math.round(weatherVisualTime).toString();
    dom.gameCanvas.dataset.autumnColourProgress = getAutumnColourProgress().toFixed(4);
    dom.gameCanvas.dataset.autumnTransitionDays = "5";
    dom.gameCanvas.dataset.autumnTransitionStart = "summer-last-3";
    dom.gameCanvas.dataset.autumnTransitionEnd = "autumn-first-2";
    dom.gameCanvas.dataset.deciduousCanopyProgress = getDeciduousCanopyProgress().toFixed(4);
    dom.gameCanvas.dataset.evergreenPercent = String(EVERGREEN_TREE_SHARE * 100);
    dom.gameCanvas.dataset.autumnLeafDropDays = String(SEASONAL_LEAF_FADE_DAYS);
    dom.gameCanvas.dataset.springLeafGrowthDays = String(SEASONAL_LEAF_FADE_DAYS);
    dom.gameCanvas.dataset.winterDeciduousLeaves = "0";
    dom.gameCanvas.dataset.scenario = state.scenarioId || "freeplay";
    const activeScenario = getActiveScenario();
    const scenarioCrisis = getScenarioCrisisState(activeScenario);
    dom.gameCanvas.dataset.restorationScenario = String(Boolean(activeScenario?.restoration));
    dom.gameCanvas.dataset.scenarioCrisisActive = String(scenarioCrisis.active);
    dom.gameCanvas.dataset.scenarioStartingEcosystem = activeScenario ? ecosystemScore(activeScenario.ecosystem).toFixed(2) : "";
    dom.gameCanvas.dataset.ecosystemCollapseBelow = String(ECOSYSTEM_COLLAPSE_THRESHOLD);
    dom.gameCanvas.dataset.ecosystemCollapseAnyIndicator = "0";
    dom.gameCanvas.dataset.achievementCount = String(ACHIEVEMENTS.length);
    dom.gameCanvas.dataset.perfectEcosystemThreshold = String(PERFECT_ECOSYSTEM_DISPLAY_THRESHOLD);
    dom.gameCanvas.dataset.perfectBalanceDifficulty = "harsh";
    dom.gameCanvas.dataset.buildingCount = String(state.buildings.length);
    dom.gameCanvas.dataset.childhoodDays = "7";
    dom.gameCanvas.dataset.adultStageMinDays = "35";
    dom.gameCanvas.dataset.adultStageMaxDays = "40";
    dom.gameCanvas.dataset.pollutionTargets = "crops-only";
    dom.gameCanvas.dataset.farmPolluters = String(state.buildings.filter(building => building.type === "farm" && BUILDINGS.farm.pollution).length);
    dom.gameCanvas.dataset.rawProducerPollutionLoss = String(Math.round(rawProducers.reduce((worst, building) => Math.max(worst, 1 - getLocalProductionFactor(building)), 0) * 100));
    dom.gameCanvas.dataset.descriptionsEnabled = String(state.descriptionsEnabled !== false);
    dom.gameCanvas.dataset.windmillJobs = String(BUILDINGS.windmill.jobs);
    dom.gameCanvas.dataset.rainGardenJobs = String(BUILDINGS.rain_garden.jobs);
    dom.gameCanvas.dataset.farmWorkerCapacity = String(getWorkerCapacity(BUILDINGS.farm));
    dom.gameCanvas.dataset.rainGardenWorkerCapacity = String(getWorkerCapacity(BUILDINGS.rain_garden));
    dom.gameCanvas.dataset.rainGardenOptionalWorkers = String(getWorkerCapacity(BUILDINGS.rain_garden) - BUILDINGS.rain_garden.jobs);
    dom.gameCanvas.dataset.farmFullStaffProduction = String(BUILDINGS.farm.fullStaffProduction);
    dom.gameCanvas.dataset.rainGardenFullStaffProduction = String(BUILDINGS.rain_garden.fullStaffProduction);
    dom.gameCanvas.dataset.farmAssignedWorkers = String(farms.reduce((total, building) => total + getAssignedWorkers(building.id), 0));
    dom.gameCanvas.dataset.fullyStaffedFarms = String(farms.filter(building => getAssignedWorkers(building.id) === getWorkerCapacity(BUILDINGS.farm)).length);
    dom.gameCanvas.dataset.rainGardenAssignedWorkers = String(rainGardens.reduce((total, building) => total + getAssignedWorkers(building.id), 0));
    dom.gameCanvas.dataset.fullyStaffedRainGardens = String(rainGardens.filter(building => getAssignedWorkers(building.id) === getWorkerCapacity(BUILDINGS.rain_garden)).length);
    dom.gameCanvas.dataset.residentLifespanMinDays = String(RESIDENT_LIFESPAN_MIN_DAYS);
    dom.gameCanvas.dataset.residentLifespanMaxDays = String(RESIDENT_LIFESPAN_MAX_DAYS);
    dom.gameCanvas.dataset.travellerLifespanMinDays = String(TRAVELLER_LIFESPAN_MIN_DAYS);
    dom.gameCanvas.dataset.travellerLifespanMaxDays = String(TRAVELLER_LIFESPAN_MAX_DAYS);
    dom.gameCanvas.dataset.lifespansTracked = String(state.people.filter(person => Number.isFinite(Number(person.lifeEndsAt))).length);
    dom.gameCanvas.dataset.travellingResidents = String(state.people.filter(person => person.origin === "traveller").length);
    dom.gameCanvas.dataset.naturalDeaths = String(state.stats.naturalDeaths || 0);
    dom.gameCanvas.dataset.eventMinGapDays = EVENT_MIN_GAP_DAYS.toFixed(4);
    dom.gameCanvas.dataset.eventMaxGapDays = String(EVENT_MAX_GAP_DAYS);
    dom.gameCanvas.dataset.eventMaximumPerDay = String(Math.round(1 / EVENT_MIN_GAP_DAYS));
    dom.gameCanvas.dataset.randomEventCount = String(EVENTS.length);
    dom.gameCanvas.dataset.randomEventIds = EVENTS.map(event => event.id).join(",");
    dom.gameCanvas.dataset.nextEventInDays = Math.max(0, Number(state.nextEventDay) - getWorldTime()).toFixed(4);
    dom.gameCanvas.dataset.illnessActive = String(Number(state.buffs.illnessUntil) > getWorldTime());
    dom.gameCanvas.dataset.illnessRemainingDays = Math.max(0, (Number(state.buffs.illnessUntil) || 0) - getWorldTime()).toFixed(4);
    dom.gameCanvas.dataset.staffedProductionActive = String(staffedWorkActive);
    dom.gameCanvas.dataset.passiveProductionActive = "true";
    dom.gameCanvas.dataset.nightProductionPolicy = "staffed-stops-passive-continues";
    dom.gameCanvas.dataset.productionShift = `${formatVillageTime(STAFFED_SHIFT_START_HOUR)}-${formatVillageTime(getStaffedShiftEndHour())}`;
    dom.gameCanvas.dataset.productionRateDisplay = "24-hour-average";
    dom.gameCanvas.dataset.staffedShiftHours = (getStaffedShiftEndHour() - STAFFED_SHIFT_START_HOUR).toFixed(1);
    dom.gameCanvas.dataset.staffedBuildingsClosed = String(staffedWorkActive ? 0 : state.buildings.filter(building => BUILDINGS[building.type]?.jobs).length);
    dom.gameCanvas.dataset.passiveBuildingsOperating = String(state.buildings.filter(building => !BUILDINGS[building.type]?.jobs).length);
    for (const resource of ["food", "water", "wood", "stone"]) {
      dom.gameCanvas.dataset[`productionRate${resource.charAt(0).toUpperCase()}${resource.slice(1)}`] = productionRates[resource].toFixed(4);
      dom.gameCanvas.dataset[`currentRate${resource.charAt(0).toUpperCase()}${resource.slice(1)}`] = currentProductionRates[resource].toFixed(4);
    }
  }

  function renderAll() {
    if (!state) return;
    syncPeopleRoster();
    renderCalendar();
    renderResources();
    renderBuildList();
    renderEcosystem();
    renderLearning();
    renderObjectives();
    renderPlacementGuide();
    renderLog();
    renderFooter();
    syncVillagers();
    // UI renders (including fast-forward test steps) need a current snapshot;
    // animation frames still use the throttled update path.
    updateVillagerDataAttributes(true);
    updateWorldDataAttributes();
    updateSelectionUi();
    renderCameraUi();
    renderDescriptionToggle();
    dom.achievementCount.textContent = `${Object.keys(achievements).length}/${ACHIEVEMENTS.length}`;
  }

  function getTileScale() {
    return BASE_TILE_SIZE * state.camera.zoom;
  }

  function worldToCanvas(worldX, worldY) {
    const scale = getTileScale();
    return {
      x: dom.gameCanvas.width / 2 + (worldX - state.camera.x) * scale,
      y: dom.gameCanvas.height / 2 + (worldY - state.camera.y) * scale
    };
  }

  function canvasToWorld(canvasX, canvasY) {
    const scale = getTileScale();
    return {
      x: state.camera.x + (canvasX - dom.gameCanvas.width / 2) / scale,
      y: state.camera.y + (canvasY - dom.gameCanvas.height / 2) / scale
    };
  }

  function clampCamera() {
    const scale = getTileScale();
    const halfX = Math.min(WORLD_SIZE / 2, dom.gameCanvas.width / (2 * scale));
    const halfY = Math.min(WORLD_SIZE / 2, dom.gameCanvas.height / (2 * scale));
    state.camera.x = clamp(state.camera.x, halfX, WORLD_SIZE - halfX);
    state.camera.y = clamp(state.camera.y, halfY, WORLD_SIZE - halfY);
  }

  function setMapZoom(nextZoom, canvasX = dom.gameCanvas.width / 2, canvasY = dom.gameCanvas.height / 2) {
    const before = canvasToWorld(canvasX, canvasY);
    state.camera.zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const scale = getTileScale();
    state.camera.x = before.x - (canvasX - dom.gameCanvas.width / 2) / scale;
    state.camera.y = before.y - (canvasY - dom.gameCanvas.height / 2) / scale;
    clampCamera();
    renderCameraUi();
    keepMapResponsive();
  }

  function centreMap() {
    state.camera.x = WORLD_CENTER;
    state.camera.y = WORLD_CENTER;
    state.camera.zoom = 0.85;
    clampCamera();
    renderCameraUi();
    keepMapResponsive();
  }

  function renderCameraUi() {
    if (dom.zoomLabel) dom.zoomLabel.textContent = `${Math.round(state.camera.zoom * 100)}%`;
  }

  function renderDescriptionToggle() {
    if (!dom.descriptionToggle) return;
    const enabled = state.descriptionsEnabled !== false;
    dom.descriptionToggle.setAttribute("aria-pressed", String(enabled));
    dom.descriptionToggle.textContent = enabled ? "ⓘ Descriptions on" : "ⓘ Descriptions off";
    dom.descriptionToggle.title = enabled ? "Turn cursor descriptions off" : "Turn cursor descriptions on";
    if (!enabled) dom.tileTooltip.hidden = true;
  }

  function getVisibleBounds(margin = 1) {
    const scale = getTileScale();
    return {
      minX: clamp(Math.floor(state.camera.x - dom.gameCanvas.width / (2 * scale)) - margin, 0, WORLD_SIZE - 1),
      maxX: clamp(Math.ceil(state.camera.x + dom.gameCanvas.width / (2 * scale)) + margin, 0, WORLD_SIZE - 1),
      minY: clamp(Math.floor(state.camera.y - dom.gameCanvas.height / (2 * scale)) - margin, 0, WORLD_SIZE - 1),
      maxY: clamp(Math.ceil(state.camera.y + dom.gameCanvas.height / (2 * scale)) + margin, 0, WORLD_SIZE - 1)
    };
  }

  function canvasTileFromEvent(event) {
    const rect = dom.gameCanvas.getBoundingClientRect();
    const canvasX = (event.clientX - rect.left) * dom.gameCanvas.width / rect.width;
    const canvasY = (event.clientY - rect.top) * dom.gameCanvas.height / rect.height;
    const world = canvasToWorld(canvasX, canvasY);
    return {
      x: Math.floor(world.x),
      y: Math.floor(world.y),
      canvasX,
      canvasY,
      localX: event.clientX - rect.left,
      localY: event.clientY - rect.top,
      frameWidth: rect.width,
      frameHeight: rect.height
    };
  }

  function clearTreePriorityTimer() {
    if (treePriorityTimer) window.clearTimeout(treePriorityTimer);
    treePriorityTimer = 0;
  }

  function toggleTreePriority(x, y) {
    if (!isStandingTree(x, y)) return false;
    state.priorityTrees = state.priorityTrees || {};
    const index = tileIndex(x, y);
    const alreadyPrioritized = Boolean(state.priorityTrees[index]);
    if (alreadyPrioritized) {
      delete state.priorityTrees[index];
      state.stats.treesUnprioritized = (state.stats.treesUnprioritized || 0) + 1;
      showToast("Tree priority removed", "Loggers will return to their normal queue unless this tree is marked again.", "○");
      addLog(`The priority mark was removed from the standing tree at ${x + 1}, ${y + 1}.`);
      saveGame();
    } else {
      state.priorityTrees[index] = getWorldTime();
      state.stats.treesPrioritized = (state.stats.treesPrioritized || 0) + 1;
      const camps = state.buildings.filter(building => building.type === "lumber");
      const insideCamp = camps.some(camp => isTreeInLoggingRange(camp, x, y));
      const detail = !camps.length
        ? "The tree is marked and will wait for a staffed Logging Camp."
        : insideCamp
          ? "Loggers will take this target first at the circle’s 10×, 30-minute base speed."
          : "Loggers will travel beyond their circle and fell this target in five base hours with a full crew.";
      showToast("Tree marked as priority", detail, "⌖");
      addLog(`A tree at ${x + 1}, ${y + 1} was marked as a priority logging target.`);
      saveGame();
    }
    renderAll();
    return true;
  }

  function toggleStumpPriority(x, y) {
    const index = tileIndex(x, y);
    if (!inWorld(x, y) || !state.loggedTrees?.[index] || state.clearedTiles?.[index]) return false;
    state.priorityStumps = state.priorityStumps || {};
    state.remoteStumps = state.remoteStumps || {};
    if (state.priorityStumps[index]) {
      delete state.priorityStumps[index];
      delete state.remoteStumps[index];
      showToast("Stump priority removed", "Loggers will return to their normal stump queue.", "○");
      addLog(`The priority mark was removed from the stump at ${x + 1}, ${y + 1}.`);
    } else {
      const camps = state.buildings
        .filter(building => building.type === "lumber")
        .map(camp => ({ camp, distance: (camp.x + camp.w / 2 - x - 0.5) ** 2 + (camp.y + camp.h / 2 - y - 0.5) ** 2 }))
        .sort((a, b) => a.distance - b.distance);
      const camp = camps[0]?.camp || null;
      state.priorityStumps[index] = camp?.id || -1;
      if (camp && !isTreeInLoggingRange(camp, x, y)) state.remoteStumps[index] = camp.id;
      const detail = !camp
        ? "The stump is marked and will wait for a Logging Camp."
        : isTreeInLoggingRange(camp, x, y)
          ? "The nearest Logging Camp will clear it before ordinary stumps."
          : "The nearest Logging Camp will travel to clear it before ordinary stumps.";
      showToast("Stump marked as priority", detail, "⌖");
      addLog(`A stump at ${x + 1}, ${y + 1} was marked as a priority clearing target.`);
    }
    saveGame();
    renderAll();
    return true;
  }

  function toggleLoggingPriority(x, y) {
    return toggleTreePriority(x, y) || toggleStumpPriority(x, y);
  }

  function prioritizeTreesInArea(start, end) {
    const minX = clamp(Math.min(start.x, end.x), 0, WORLD_SIZE - 1);
    const maxX = clamp(Math.max(start.x, end.x), 0, WORLD_SIZE - 1);
    const minY = clamp(Math.min(start.y, end.y), 0, WORLD_SIZE - 1);
    const maxY = clamp(Math.max(start.y, end.y), 0, WORLD_SIZE - 1);
    state.priorityTrees = state.priorityTrees || {};
    const trees = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const index = tileIndex(x, y);
        if (isStandingTree(x, y)) trees.push(index);
      }
    }
    if (!trees.length) return false;
    const removing = trees.every(index => Boolean(state.priorityTrees[index]));
    if (removing) {
      trees.forEach(index => delete state.priorityTrees[index]);
      state.stats.treesUnprioritized = (state.stats.treesUnprioritized || 0) + trees.length;
      showToast(`${trees.length} tree${trees.length === 1 ? "" : "s"} unmarked`, "Loggers will return to their normal queue for these trees.", "○");
      addLog(`${trees.length} tree${trees.length === 1 ? " priority was" : " priorities were"} removed.`);
    } else {
      const added = trees.filter(index => !state.priorityTrees[index]);
      added.forEach(index => { state.priorityTrees[index] = getWorldTime(); });
      state.stats.treesPrioritized = (state.stats.treesPrioritized || 0) + added.length;
      showToast(`${added.length} tree${added.length === 1 ? "" : "s"} marked`, "Priority trees are harvested before every stump and automatic target.", "⌖");
      addLog(`${added.length} tree${added.length === 1 ? " was" : "s were"} marked as priority logging targets.`);
    }
    saveGame();
    renderAll();
    return true;
  }

  function beginMapGesture(event) {
    if (event.button !== 0 || !gameActive || dom.modalLayer.children.length) return;
    clearTreePriorityTimer();
    keepMapResponsive();
    const rect = dom.gameCanvas.getBoundingClientRect();
    const point = canvasTileFromEvent(event);
    mapGesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cameraX: state.camera.x,
      cameraY: state.camera.y,
      canvasRatioX: dom.gameCanvas.width / rect.width,
      canvasRatioY: dom.gameCanvas.height / rect.height,
      dragging: false,
      longPressTriggered: false,
      priorityCandidate: null,
      priorityAreaStart: activeTool === "tree_priority" ? { x: point.x, y: point.y } : null,
      priorityAreaEnd: activeTool === "tree_priority" ? { x: point.x, y: point.y } : null
    };
    if (!selectedBuilding && activeTool === "inspect" && (isStandingTree(point.x, point.y) || (state.loggedTrees?.[tileIndex(point.x, point.y)] && !state.clearedTiles?.[tileIndex(point.x, point.y)]))) {
      mapGesture.priorityCandidate = { x: point.x, y: point.y };
      treePriorityTimer = window.setTimeout(() => {
        if (!mapGesture || mapGesture.pointerId !== event.pointerId || mapGesture.dragging) return;
        const candidate = mapGesture.priorityCandidate;
        if (candidate && toggleLoggingPriority(candidate.x, candidate.y)) mapGesture.longPressTriggered = true;
        treePriorityTimer = 0;
      }, TREE_PRIORITY_HOLD_MS);
    }
    try { dom.gameCanvas.setPointerCapture?.(event.pointerId); } catch { /* Synthetic tests may not own pointer capture. */ }
  }

  function handleCanvasMove(event) {
    keepMapResponsive();
    if (mapGesture && mapGesture.pointerId === event.pointerId) {
      const dx = event.clientX - mapGesture.startX;
      const dy = event.clientY - mapGesture.startY;
      if (activeTool === "tree_priority") {
        mapGesture.priorityAreaEnd = canvasTileFromEvent(event);
        mapGesture.dragging = Math.hypot(dx, dy) > 5;
        return;
      }
      if (Math.hypot(dx, dy) > 5) {
        mapGesture.dragging = true;
        clearTreePriorityTimer();
      }
      if (mapGesture.longPressTriggered) return;
      if (mapGesture.dragging) {
        state.camera.x = mapGesture.cameraX - dx * mapGesture.canvasRatioX / getTileScale();
        state.camera.y = mapGesture.cameraY - dy * mapGesture.canvasRatioY / getTileScale();
        clampCamera();
        hoveredTile = null;
        hoveredVillagerId = null;
        dom.tileTooltip.hidden = true;
        dom.gameCanvas.style.cursor = "grabbing";
        return;
      }
    }

    const point = canvasTileFromEvent(event);
    if (!inWorld(point.x, point.y)) {
      hoveredTile = null;
      hoveredVillagerId = null;
      dom.tileTooltip.hidden = true;
      return;
    }
    hoveredTile = { x: point.x, y: point.y };
    const building = getBuildingAt(point.x, point.y);
    const villagerHit = findVillagerAtCanvasPoint(point.canvasX, point.canvasY);
    hoveredVillagerId = villagerHit?.record.id || null;
    if (villagerHit) dom.gameCanvas.style.cursor = "pointer";
    else if (!selectedBuilding) dom.gameCanvas.style.cursor = activeTool === "demolish" ? "not-allowed" : "crosshair";
    if (state.descriptionsEnabled === false) {
      dom.tileTooltip.hidden = true;
      dom.coordinatesLabel.textContent = villagerHit
        ? `${villagerHit.record.name} · World tile ${point.x + 1}, ${point.y + 1}`
        : `World tile ${point.x + 1}, ${point.y + 1} · ${getTerrainLabel(point.x, point.y)}`;
      return;
    }
    let html;
    if (selectedBuilding) {
      const selected = BUILDINGS[selectedBuilding];
      const size = getBuildingSize(selectedBuilding, selectedRotation);
      const origin = getPlacementOrigin(selectedBuilding, point.x, point.y, selectedRotation);
      const placement = getPlacementStatus(selectedBuilding, origin.x, origin.y, selectedRotation);
      const preview = { type: selectedBuilding, x: origin.x, y: origin.y, w: size.w, h: size.h, id: -1 };
      const zoneDetail = selectedBuilding === "lumber" ? ` · ${getLoggingTreesInRange(preview).length} wild trees · ${getWoodFarmsInRange(preview).length} Wood Farms in range` : "";
      const crossingDetail = selected.bridge
        ? ` · spans ${selected.bridge === "river" ? "three river tiles" : "one creek tile"} with a clearing tile on each bank`
        : "";
      const previewNoise = selected.noise ? getNoiseSourceHousingInfo(preview) : null;
      const noiseDetail = previewNoise ? ` · ${previewNoise.range}-tile noise zone reaches ${previewNoise.occupiedHomes} occupied home${previewNoise.occupiedHomes === 1 ? "" : "s"}` : "";
      html = `<strong>${placement.valid ? `Place ${escapeHtml(selected.name)}` : "Cannot build here"}</strong><span>${size.w} × ${size.h} footprint · ${["North", "East", "South", "West"][selectedRotation]}</span><span class="tooltip-impact">${escapeHtml(placement.valid ? `${selected.impactLabel}${crossingDetail}${zoneDetail}${noiseDetail} · O left / P right` : placement.reason)}</span>`;
    } else if (villagerHit) {
      const info = personWorkInfo(villagerHit.record);
      const priority = getWorkPriorityMeta(villagerHit.record.workPriority);
      const carrying = villagerHit.record.carriedAmount
        ? `Carrying ${villagerHit.record.carriedAmount} ${villagerHit.record.carriedItem}`
        : `Can carry ${villagerHit.record.carryCapacity} item${villagerHit.record.carryCapacity === 1 ? "" : "s"}`;
      html = `<strong>${escapeHtml(villagerHit.record.name)}</strong><span>${escapeHtml(info.title)} · ${escapeHtml(info.workplace)}</span><span class="tooltip-impact">${priority.icon} ${priority.label} work priority · ${escapeHtml(carrying)} · Click to inspect</span>`;
    } else if (building) {
      const def = BUILDINGS[building.type];
      let localDetail = `Click to ${activeTool === "demolish" ? "destroy for a 50% refund" : "inspect"}`;
      if (building.type === "lumber") {
        const wildTrees = getLoggingTreesInRange(building).length;
        const farmTrees = getMatureWoodFarmSupply(building).length;
        const target = getLoggingTarget(building);
        const targetYield = getLoggingTargetTimberYield(target);
        const storageBlocked = isLoggingStorageBlocked(building);
        const source = storageBlocked
          ? "not enough timber storage for next load · automatically paused"
          : target?.priority
          ? `priority tree · ${targetYield} timber · ${target.inRange ? "10× · 30-minute base" : "regular · 5-hour base"}`
          : target?.kind === "farm"
            ? `${farmTrees} mature farm trees · selected before ${wildTrees} unmarked wild tree${wildTrees === 1 ? "" : "s"} · next yields ${targetYield} timber`
            : target?.kind === "wild"
              ? target.remote
                ? `nearest outside-zone tree · next yields ${targetYield} timber · ${OUTSIDE_TREE_FELLING_HOURS}-hour full-crew pace`
                : `${wildTrees} wild trees · next yields ${targetYield} timber · 10× felling`
              : "production stopped — no mature trees";
        const workStumps = getLoggingWorkStumps(building);
        const priorityStumps = workStumps.filter(stump => stump.priority).length;
        localDetail = `${storageBlocked ? source : target?.priority ? source : workStumps.length ? `${priorityStumps ? "priority" : "ordinary"} stump work · chopping paused` : source} · ${localDetail}`;
      }
      if (building.type === "wood_farm") localDetail = `${getMatureWoodFarmPlots(building).length}/${WOOD_FARM_PLOTS} trees mature · ${TREE_TIMBER_MIN}–${TREE_TIMBER_MAX} timber each · ${localDetail}`;
      if (def.bridge) localDetail = `${def.bridge === "river" ? "Three river tiles" : "One creek tile"} spanned · every deck tile walkable · channel remains open · ${localDetail}`;
      if (def.storage) localDetail = `${def.storage} capacity for each resource · ${localDetail}`;
      if (def.storageByResource) localDetail = `${Object.entries(def.storageByResource).map(([resource, amount]) => `${amount} ${resource} only`).join(" · ")} · ${localDetail}`;
      if (["farm", "orchard"].includes(building.type)) localDetail = `${Math.round(getCropPollutionInfo(building).penalty * 100)}% output lost to nearby pollution · ${localDetail}`;
      if (def.pollution) localDetail = `${getForestPollutionInfo(building).trees} forest trees exposed to pollution · ${localDetail}`;
      if (def.noise) {
        const noise = getNoiseSourceHousingInfo(building);
        localDetail = `${noise.occupiedHomes} occupied home${noise.occupiedHomes === 1 ? "" : "s"} in ${noise.range}-tile noise zone · ${noise.exposedResidents} resident${noise.exposedResidents === 1 ? "" : "s"} · ${localDetail}`;
      }
      if (def.housing) {
        const homeNoise = getHousingNoiseInfo(building);
        localDetail = homeNoise.sourcesInRange
          ? `${homeNoise.sourcesInRange} nearby noise source${homeNoise.sourcesInRange === 1 ? "" : "s"} · -${homeNoise.moodLoss.toFixed(2)} morale/day · ${localDetail}`
          : `Outside active noise zones · ${localDetail}`;
      }
      const workerCapacity = getWorkerCapacity(def);
      if (workerCapacity) {
        const priority = getWorkPriorityMeta(building.staffingPriority);
        localDetail = `${priority.icon} ${priority.label} job priority · ${localDetail}`;
      }
      if (def.fullStaffProduction) {
        const multiplier = getBuildingProductionMultiplier(building, state, !isVillagerNight(), 1);
        localDetail = `${getAssignedWorkers(building.id)}/${workerCapacity} workers · ${formatProductionMultiplier(multiplier)}× output · ${localDetail}`;
      }
      const scheduleDetail = def.bridge
        ? "Permanent crossing · no workers"
        : def.automaticProduction !== undefined && workerCapacity
          ? isVillagerNight() ? `Automatic baseline · helper boost paused until ${formatVillageTime(STAFFED_SHIFT_START_HOUR)}` : "Automatic baseline + daytime helpers"
          : def.jobs
          ? isVillagerNight() ? `Night shutdown · resumes at ${formatVillageTime(STAFFED_SHIFT_START_HOUR)}` : `Day shift operating until ${formatVillageTime(getStaffedShiftEndHour())}`
          : "Automatic · operates 24 hours";
      localDetail = `${scheduleDetail} · ${localDetail}`;
      html = `<strong>${escapeHtml(def.name)}</strong><span>${building.w} × ${building.h} · ${["North", "East", "South", "West"][normaliseRotation(building.rotation)]} · built Day ${building.builtDay}</span><span class="tooltip-impact">${escapeHtml(localDetail)}</span>`;
    } else if (state.loggedTrees?.[tileIndex(point.x, point.y)]) {
      const priorityStump = Boolean(state.priorityStumps?.[tileIndex(point.x, point.y)]);
      const burnedStump = isBurnedTree(point.x, point.y);
      const stumpInFastZone = state.buildings.some(camp => camp.type === "lumber" && isTreeInLoggingRange(camp, point.x, point.y));
      const fireScarDetail = state.scenarioId === "burned_watershed" ? " · adjacent treeless fire-scar forest also opens" : "";
      const priorityHint = priorityStump ? "Cleared before ordinary stumps · hold or use Tree priority to remove mark" : "Cleared before automatic chopping · hold or use Tree priority to mark first";
      html = `<strong>${priorityStump ? "High-priority stump" : burnedStump ? "Charred logging stump" : "Logging stump"}</strong><span>World tile ${point.x + 1}, ${point.y + 1} · ${stumpInFastZone ? "10× zone speed · 30-minute base" : "outside zone · 5-hour base"}</span><span class="tooltip-impact">${priorityHint} · same speed as a tree here · +1 timber · becomes clearing${fireScarDetail}</span>`;
    } else if (getWaterwayType(point.x, point.y)) {
      const waterway = getWaterwayType(point.x, point.y);
      const crossing = waterway === "river" ? "River Bridge" : "Creek Footbridge";
      const frozen = areWaterwaysFrozen();
      const dryWaterway = isScenarioWaterwayDryAt(point.x, point.y);
      html = `<strong>${dryWaterway ? waterway === "river" ? "Exposed riverbed" : "Dry creek bed" : frozen ? "Frozen " : ""}${dryWaterway ? "" : waterway === "river" ? "river channel" : "forest creek"}</strong><span>World tile ${point.x + 1}, ${point.y + 1} · ${waterway === "river" ? "three-tile-wide main channel" : "one-tile tributary"}${dryWaterway ? " · waiting for autumn rain" : frozen ? " · winter ice" : ""}</span><span class="tooltip-impact">${dryWaterway ? "The drought has dried this protected channel; the autumn thunderstorm will refill it" : frozen ? "Ice may hide moving water and uneven thickness" : "Blocks ordinary walking and construction"} · clear both banks and use a ${crossing} · keeping water connected supports downstream habitat</span>`;
    } else if (isStandingTree(point.x, point.y)) {
      const prioritized = Boolean(state.priorityTrees?.[tileIndex(point.x, point.y)]);
      const inFastZone = state.buildings.some(camp => camp.type === "lumber" && isTreeInLoggingRange(camp, point.x, point.y));
      const timberYield = getWildTreeTimberYield(point.x, point.y);
      const treeAppearance = getWildTreeAppearance(point.x, point.y);
      const seasonalDetail = treeAppearance.burned
        ? "Fire-damaged · permanently black and leafless · 30% less timber"
        : treeAppearance.evergreen
        ? "Evergreen · green all year"
        : treeAppearance.leafAmount <= 0.001
          ? "Deciduous · leafless for winter"
          : treeAppearance.leafAmount < 0.999
            ? "Deciduous · canopy changing with the season"
            : "Deciduous · seasonal leaves";
      html = `<strong>${prioritized ? "Priority logging tree" : treeAppearance.burned ? "Fire-damaged tree" : "Old-growth tree"}</strong><span>World tile ${point.x + 1}, ${point.y + 1} · ${seasonalDetail} · ${timberYield} timber · ${inFastZone ? "10× zone · 30-minute base" : "outside zone · 5-hour base"}</span><span class="tooltip-impact">${prioritized ? `Ahead of every stump and automatic target · hold for ${(TREE_PRIORITY_HOLD_MS / 1000).toFixed(2)} seconds to remove priority` : `Hold for ${(TREE_PRIORITY_HOLD_MS / 1000).toFixed(2)} seconds to prioritize`} · exact time still reflects crew, weather, illness and education</span>`;
    } else if (isClearing(point.x, point.y)) {
      html = `<strong>Open clearing</strong><span>Tile ${point.x + 1}, ${point.y + 1}</span><span class="tooltip-impact">Ready for construction</span>`;
    } else {
      html = `<strong>Old-growth forest</strong><span>World tile ${point.x + 1}, ${point.y + 1}</span><span class="tooltip-impact">Outside the buildable clearing</span>`;
    }
    dom.tileTooltip.innerHTML = html;
    dom.tileTooltip.hidden = false;
    const tooltipWidth = dom.tileTooltip.offsetWidth;
    const tooltipHeight = dom.tileTooltip.offsetHeight;
    const left = clamp(point.localX + 20, 8, Math.max(8, point.frameWidth - tooltipWidth - 8));
    const fitsBelow = point.localY + 20 + tooltipHeight <= point.frameHeight - 8;
    const top = fitsBelow ? point.localY + 20 : point.localY - tooltipHeight - 20;
    dom.tileTooltip.style.left = `${left}px`;
    dom.tileTooltip.style.top = `${clamp(top, 8, Math.max(8, point.frameHeight - tooltipHeight - 8))}px`;
    dom.coordinatesLabel.textContent = villagerHit
      ? `${villagerHit.record.name} · World tile ${point.x + 1}, ${point.y + 1}`
      : `World tile ${point.x + 1}, ${point.y + 1} · ${getTerrainLabel(point.x, point.y)}`;
  }

  function endMapGesture(event) {
    if (!mapGesture || mapGesture.pointerId !== event.pointerId) return;
    const dragged = mapGesture.dragging;
    const longPressTriggered = mapGesture.longPressTriggered;
    const priorityAreaStart = mapGesture.priorityAreaStart;
    const priorityAreaEnd = mapGesture.priorityAreaEnd;
    clearTreePriorityTimer();
    mapGesture = null;
    try { dom.gameCanvas.releasePointerCapture?.(event.pointerId); } catch { /* Pointer may already be released. */ }
    updateSelectionUi();
    if (priorityAreaStart) {
      if (dragged) prioritizeTreesInArea(priorityAreaStart, priorityAreaEnd);
      else toggleLoggingPriority(priorityAreaStart.x, priorityAreaStart.y);
    } else if (!dragged && !longPressTriggered) handleCanvasAction(event);
  }

  function handleCanvasAction(event) {
    if (!gameActive || state.gameOver || dom.modalLayer.children.length) return;
    const point = canvasTileFromEvent(event);
    if (!inWorld(point.x, point.y)) return;
    if (selectedBuilding) placeBuilding(point.x, point.y);
    else if (activeTool === "demolish") destroyBuilding(point.x, point.y);
    else {
      const villagerHit = findVillagerAtCanvasPoint(point.canvasX, point.canvasY);
      if (villagerHit) inspectVillager(villagerHit.record);
      else inspectBuilding(point.x, point.y);
    }
  }

  function handleMapWheel(event) {
    event.preventDefault();
    if (!gameActive) return;
    const point = canvasTileFromEvent(event);
    const factor = event.deltaY < 0 ? 1.13 : 1 / 1.13;
    setMapZoom(state.camera.zoom * factor, point.canvasX, point.canvasY);
  }

  function drawMap(now, deltaMs) {
    const canvas = dom.gameCanvas;
    if (!canvas || !state) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#071b13";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const bounds = getVisibleBounds(2);

    drawTerrainLayer(ctx, now, bounds);
    drawTreePrioritySelection(ctx);
    drawAmbientWildlife(ctx, now);
    for (const building of state.buildings) {
      if (building.x + building.w < bounds.minX || building.x > bounds.maxX || building.y + building.h < bounds.minY || building.y > bounds.maxY) continue;
      drawBuilding(ctx, building, now);
    }
    drawVillagers(ctx, now);
    drawTutorialRecommendation(ctx, now);

    if (hoveredTile && !hoveredVillagerId) drawHover(ctx, hoveredTile.x, hoveredTile.y);
    drawNight(ctx);
    drawNightLights(ctx, bounds);
    drawWeather(ctx, deltaMs);
  }

  function getTerrainCacheKey() {
    const buildings = state.buildings.map(building => `${building.id}:${building.type}:${building.x}:${building.y}:${building.rotation || 0}`).join(",");
    const priorityTrees = Object.keys(state.priorityTrees || {}).join(",");
    const priorityStumps = Object.keys(state.priorityStumps || {}).join(",");
    return [
      dom.gameCanvas.width, dom.gameCanvas.height,
      state.camera.x.toFixed(3), state.camera.y.toFixed(3), state.camera.zoom.toFixed(4),
      getSeason().id, getWeather().id, state.weatherFrom, Math.round((state.weatherBlend || 0) * 20),
      Math.round(state.ecosystem.soil * 4), Math.round(state.ecosystem.forest * 4),
      state.scenarioId, state.dryRiverRefilled, state.dryRiverGushStartedAt,
      Object.keys(state.loggedTrees || {}).length, Object.keys(state.clearedTiles || {}).length,
      priorityTrees, priorityStumps, buildings
    ].join("|");
  }

  function drawTerrainLayer(ctx, now, bounds) {
    // At wide zoom the same detailed terrain covers the whole canvas for many
    // frames. Cache that exact paint and redraw it only when the world, view or
    // terrain appearance changes; buildings, people and weather still render live.
    if (state.camera.zoom >= TERRAIN_CACHE_ZOOM_THRESHOLD) {
      terrainCacheKey = "";
      drawTerrain(ctx, now, bounds);
      return;
    }
    const key = getTerrainCacheKey();
    if (!terrainCacheCanvas || terrainCacheCanvas.width !== dom.gameCanvas.width || terrainCacheCanvas.height !== dom.gameCanvas.height) {
      terrainCacheCanvas = document.createElement("canvas");
      terrainCacheCanvas.width = dom.gameCanvas.width;
      terrainCacheCanvas.height = dom.gameCanvas.height;
      terrainCacheKey = "";
    }
    if (terrainCacheKey !== key) {
      drawTerrain(ctx, now, bounds);
      const cacheContext = terrainCacheCanvas.getContext("2d");
      cacheContext.clearRect(0, 0, terrainCacheCanvas.width, terrainCacheCanvas.height);
      cacheContext.drawImage(dom.gameCanvas, 0, 0);
      terrainCacheKey = key;
      return;
    }
    ctx.drawImage(terrainCacheCanvas, 0, 0);
  }

  function drawTutorialRecommendation(ctx, now) {
    const recommendation = tutorialSuggestedPlacement;
    if (!recommendation) return;
    const scale = getTileScale();
    const screen = worldToCanvas(recommendation.x, recommendation.y);
    const pulse = 0.7 + Math.sin(now / 260) * 0.2;
    const inset = Math.max(1, scale * 0.06);
    const width = recommendation.w * scale - inset * 2;
    const height = recommendation.h * scale - inset * 2;
    ctx.save();
    ctx.fillStyle = `rgba(33, 150, 243, ${0.08 + pulse * 0.07})`;
    ctx.fillRect(screen.x + inset, screen.y + inset, width, height);
    ctx.strokeStyle = `rgba(12, 93, 211, ${0.25 + pulse * 0.18})`;
    ctx.lineWidth = Math.max(7, scale * 0.32);
    ctx.strokeRect(screen.x + inset, screen.y + inset, width, height);
    ctx.strokeStyle = `rgba(51, 170, 255, ${0.88 + pulse * 0.12})`;
    ctx.lineWidth = Math.max(3.5, scale * 0.16);
    ctx.strokeRect(screen.x + inset, screen.y + inset, width, height);
    ctx.restore();
  }

  function drawTerrain(ctx, now, bounds) {
    const season = getSeason();
    const weatherId = getWeather().id;
    const scale = getTileScale();
    const soil = state.ecosystem.soil;
    const forestHealth = state.ecosystem.forest / 100;
    const autumnColourProgress = getAutumnColourProgress();
    const deciduousCanopyProgress = getDeciduousCanopyProgress();
    const snowing = season.id === "winter" && ["snow", "blizzard", "frost"].includes(weatherId);
    const grass = {
      r: season.id === "autumn" ? 74 : 48 + soil * 0.15,
      g: season.id === "winter" ? 66 : 61 + soil * 0.32,
      b: season.id === "winter" ? 61 : 42 + soil * 0.08
    };

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const screen = worldToCanvas(x, y);
        const variation = seededNoise(x, y, state.terrainSeed);
        const waterway = getWaterwayType(x, y);
        const clearing = isClearing(x, y);
        if (waterway) {
          drawWaterwayTile(ctx, x, y, screen, scale, waterway, season.id, weatherId, variation);
        } else if (clearing) {
          const shade = variation > 0.54 ? 4 : 0;
          ctx.fillStyle = `rgb(${Math.round(grass.r + shade)},${Math.round(grass.g + shade)},${Math.round(grass.b + shade)})`;
          ctx.fillRect(screen.x, screen.y, scale + 0.5, scale + 0.5);
          if (!state.occupancy[tileIndex(x, y)] && variation > 0.83 && scale > 13) {
            ctx.strokeStyle = season.id === "winter" ? "rgba(205,224,213,.16)" : "rgba(169,210,116,.22)";
            ctx.lineWidth = Math.max(0.6, scale / 35);
            ctx.beginPath();
            ctx.moveTo(screen.x + scale * 0.35, screen.y + scale * 0.78);
            ctx.lineTo(screen.x + scale * 0.3, screen.y + scale * 0.55);
            ctx.moveTo(screen.x + scale * 0.52, screen.y + scale * 0.8);
            ctx.lineTo(screen.x + scale * 0.59, screen.y + scale * 0.58);
            ctx.stroke();
          }
          if (snowing) {
            ctx.fillStyle = weatherId === "blizzard" ? "rgba(218,232,229,.24)" : "rgba(218,232,229,.13)";
            ctx.fillRect(screen.x, screen.y, scale + 0.5, scale + 0.5);
          }
        } else {
          ctx.fillStyle = variation > 0.5 ? "#123321" : "#153a26";
          ctx.fillRect(screen.x, screen.y, scale + 0.5, scale + 0.5);
          const treeNoise = seededNoise(x, y, state.terrainSeed ^ 0x9e3779b9);
          const index = tileIndex(x, y);
          const logged = Boolean(state.loggedTrees?.[index]);
          if (treeNoise < forestHealth + 0.1 && !logged) {
            const treeAppearance = getWildTreeAppearance(x, y);
            if (scale >= 10) {
              const sway = Math.sin(weatherVisualTime / 1300 + x * 1.7 + y) * (weatherId === "wind" || weatherId === "storm" ? 1.2 : 0.35);
              const leafVariation = seededNoise(x, y, state.terrainSeed ^ 0x51ed270b);
              ctx.save();
              ctx.translate(screen.x + scale * (0.5 + (treeNoise - 0.5) * 0.22), screen.y + scale * 0.72);
              ctx.scale(scale / 24, scale / 24);
              drawTree(ctx, sway, 0, 0.82 + treeNoise * 0.25, season.id, forestHealth, autumnColourProgress, leafVariation, treeAppearance.evergreen, deciduousCanopyProgress, treeAppearance.burned);
              ctx.restore();
            } else {
              const leafVariation = seededNoise(x, y, state.terrainSeed ^ 0x51ed270b);
              const leafAmount = treeAppearance.leafAmount;
              if (leafAmount > 0.01) {
                ctx.save();
                ctx.globalAlpha = leafAmount;
                ctx.fillStyle = getTreeColours(season.id, autumnColourProgress, leafVariation, treeAppearance.evergreen)[1];
                ctx.beginPath(); ctx.arc(screen.x + scale / 2, screen.y + scale / 2, Math.max(1, scale * 0.25), 0, Math.PI * 2); ctx.fill();
                ctx.restore();
              } else {
                ctx.strokeStyle = treeAppearance.burned ? "rgba(12,12,12,.98)" : "rgba(103,76,48,.88)";
                ctx.lineWidth = Math.max(0.8, scale * 0.09);
                ctx.beginPath();
                ctx.moveTo(screen.x + scale * 0.5, screen.y + scale * 0.78);
                ctx.lineTo(screen.x + scale * 0.5, screen.y + scale * 0.28);
                ctx.stroke();
              }
            }
            if (state.priorityTrees?.[index]) drawLoggingPriorityMarker(ctx, screen, scale);
          } else if (logged) {
            if (scale > 14) {
              const burnedStump = isBurnedTree(x, y);
              ctx.save(); ctx.translate(screen.x + scale / 2, screen.y + scale * 0.7); ctx.scale(scale / 24, scale / 24); drawStump(ctx, 0, 0, treeNoise, burnedStump); ctx.restore();
              ctx.fillStyle = burnedStump ? "rgba(30,24,22,.28)" : "rgba(175,119,66,.2)";
              ctx.beginPath(); ctx.arc(screen.x + scale / 2, screen.y + scale * 0.62, scale * 0.3, 0, Math.PI * 2); ctx.fill();
            }
            if (state.priorityStumps?.[index]) drawLoggingPriorityMarker(ctx, screen, scale);
          }
        }

        ctx.strokeStyle = clearing ? "rgba(220,240,202,.045)" : "rgba(126,176,130,.025)";
        ctx.lineWidth = 0.55;
        ctx.strokeRect(screen.x + 0.25, screen.y + 0.25, scale, scale);
        if (clearing) drawClearingEdge(ctx, x, y, screen.x, screen.y, scale);
      }
    }

    const centre = worldToCanvas(WORLD_CENTER, WORLD_CENTER);
    ctx.strokeStyle = "rgba(183,156,102,.12)";
    ctx.lineWidth = Math.max(2, scale * 0.18);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centre.x, centre.y);
    ctx.lineTo(centre.x, centre.y + scale * 5);
    ctx.moveTo(centre.x, centre.y);
    ctx.lineTo(centre.x + scale * 5, centre.y);
    ctx.stroke();
  }

  function drawWaterwayTile(ctx, x, y, screen, scale, type, seasonId, weatherId, variation) {
    const frozen = seasonId === "winter";
    const river = type === "river";
    const dryWaterway = isScenarioWaterwayDryAt(x, y);
    if (dryWaterway) {
      ctx.fillStyle = variation > 0.5 ? "#765b3d" : "#6b5237";
      ctx.fillRect(screen.x, screen.y, scale + 0.5, scale + 0.5);
      ctx.strokeStyle = "rgba(194,157,99,.42)";
      ctx.lineWidth = Math.max(0.55, scale * 0.035);
      ctx.beginPath();
      const crackX = screen.x + scale * (0.25 + variation * 0.45);
      ctx.moveTo(crackX - scale * 0.16, screen.y + scale * 0.22);
      ctx.lineTo(crackX, screen.y + scale * 0.52);
      ctx.lineTo(crackX + scale * 0.13, screen.y + scale * 0.8);
      ctx.moveTo(crackX, screen.y + scale * 0.52);
      ctx.lineTo(crackX - scale * 0.17, screen.y + scale * 0.68);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = frozen
      ? river ? variation > 0.5 ? "#7da4ad" : "#749aa5" : variation > 0.5 ? "#8ab2b4" : "#82aaae"
      : river ? variation > 0.5 ? "#245d6c" : "#205565" : variation > 0.5 ? "#33727a" : "#2c6871";
    ctx.fillRect(screen.x, screen.y, scale + 0.5, scale + 0.5);

    if (frozen) {
      const snowyIce = ["snow", "blizzard"].includes(weatherId);
      ctx.fillStyle = snowyIce ? "rgba(229,241,239,.18)" : "rgba(218,239,239,.09)";
      ctx.fillRect(screen.x, screen.y, scale + 0.5, scale + 0.5);
      ctx.strokeStyle = "rgba(226,244,243,.5)";
      ctx.lineWidth = Math.max(0.6, scale * 0.035);
      const seamOffset = 0.25 + variation * 0.46;
      ctx.beginPath();
      if (river) {
        const seamX = screen.x + scale * seamOffset;
        ctx.moveTo(seamX, screen.y - 0.5);
        ctx.lineTo(seamX + scale * (variation - 0.5) * 0.25, screen.y + scale + 0.5);
      } else {
        const seamY = screen.y + scale * seamOffset;
        ctx.moveTo(screen.x - 0.5, seamY);
        ctx.lineTo(screen.x + scale + 0.5, seamY + scale * (variation - 0.5) * 0.2);
      }
      ctx.stroke();
      if (scale > 13 && variation > 0.58) {
        const crackX = screen.x + scale * (0.34 + variation * 0.28);
        const crackY = screen.y + scale * (0.3 + (1 - variation) * 0.35);
        ctx.strokeStyle = "rgba(47,92,105,.34)";
        ctx.lineWidth = Math.max(0.55, scale * 0.025);
        ctx.beginPath();
        ctx.moveTo(crackX - scale * 0.17, crackY - scale * 0.08);
        ctx.lineTo(crackX, crackY);
        ctx.lineTo(crackX + scale * 0.13, crackY + scale * 0.16);
        ctx.moveTo(crackX, crackY);
        ctx.lineTo(crackX + scale * 0.18, crackY - scale * 0.1);
        ctx.stroke();
      }
    } else {
      const flow = positiveMod(weatherVisualTime / (river ? 1500 : 1150) + x * 0.19 + y * 0.13, 1);
      ctx.strokeStyle = river ? "rgba(139,206,214,.24)" : "rgba(164,222,210,.26)";
      ctx.lineWidth = Math.max(0.65, scale * 0.045);
      ctx.beginPath();
      if (river) {
        const lineX = screen.x + scale * (0.28 + variation * 0.42);
        ctx.moveTo(lineX, screen.y + scale * (flow - 0.35));
        ctx.lineTo(lineX, screen.y + scale * Math.min(1.15, flow + 0.4));
      } else {
        const lineY = screen.y + scale * (0.3 + variation * 0.38);
        ctx.moveTo(screen.x + scale * (flow - 0.35), lineY);
        ctx.lineTo(screen.x + scale * Math.min(1.15, flow + 0.4), lineY);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(167,145,91,.28)";
    ctx.lineWidth = Math.max(0.6, scale * 0.035);
    ctx.beginPath();
    if (!getWaterwayType(x, y - 1)) { ctx.moveTo(screen.x, screen.y + 0.5); ctx.lineTo(screen.x + scale, screen.y + 0.5); }
    if (!getWaterwayType(x + 1, y)) { ctx.moveTo(screen.x + scale - 0.5, screen.y); ctx.lineTo(screen.x + scale - 0.5, screen.y + scale); }
    if (!getWaterwayType(x, y + 1)) { ctx.moveTo(screen.x, screen.y + scale - 0.5); ctx.lineTo(screen.x + scale, screen.y + scale - 0.5); }
    if (!getWaterwayType(x - 1, y)) { ctx.moveTo(screen.x + 0.5, screen.y); ctx.lineTo(screen.x + 0.5, screen.y + scale); }
    ctx.stroke();
  }

  function drawLoggingPriorityMarker(ctx, screen, scale) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,211,105,.96)";
    ctx.fillStyle = "rgba(255,193,71,.2)";
    ctx.lineWidth = clamp(scale * 0.09, 1.2, 3.2);
    ctx.beginPath();
    ctx.arc(screen.x + scale / 2, screen.y + scale / 2, Math.max(3, scale * 0.38), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(screen.x + scale * 0.5, screen.y + scale * 0.05);
    ctx.lineTo(screen.x + scale * 0.5, screen.y + scale * 0.23);
    ctx.moveTo(screen.x + scale * 0.5, screen.y + scale * 0.77);
    ctx.lineTo(screen.x + scale * 0.5, screen.y + scale * 0.95);
    ctx.moveTo(screen.x + scale * 0.05, screen.y + scale * 0.5);
    ctx.lineTo(screen.x + scale * 0.23, screen.y + scale * 0.5);
    ctx.moveTo(screen.x + scale * 0.77, screen.y + scale * 0.5);
    ctx.lineTo(screen.x + scale * 0.95, screen.y + scale * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawTreePrioritySelection(ctx) {
    if (activeTool !== "tree_priority" || !mapGesture?.priorityAreaStart || !mapGesture?.priorityAreaEnd) return;
    const start = mapGesture.priorityAreaStart;
    const end = mapGesture.priorityAreaEnd;
    const topLeft = worldToCanvas(Math.min(start.x, end.x), Math.min(start.y, end.y));
    const bottomRight = worldToCanvas(Math.max(start.x, end.x) + 1, Math.max(start.y, end.y) + 1);
    ctx.save();
    ctx.fillStyle = "rgba(255,193,71,.16)";
    ctx.strokeStyle = "rgba(255,221,119,.96)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.restore();
  }

  function drawClearingEdge(ctx, x, y, px, py, scale) {
    ctx.strokeStyle = "rgba(183,216,150,.24)";
    ctx.lineWidth = Math.max(0.8, scale * 0.045);
    ctx.beginPath();
    if (!isClearing(x, y - 1)) { ctx.moveTo(px, py); ctx.lineTo(px + scale, py); }
    if (!isClearing(x + 1, y)) { ctx.moveTo(px + scale, py); ctx.lineTo(px + scale, py + scale); }
    if (!isClearing(x, y + 1)) { ctx.moveTo(px, py + scale); ctx.lineTo(px + scale, py + scale); }
    if (!isClearing(x - 1, y)) { ctx.moveTo(px, py); ctx.lineTo(px, py + scale); }
    ctx.stroke();
  }

  function mixHexColours(from, to, amount) {
    const progress = clamp(Number(amount) || 0, 0, 1);
    const fromValue = Number.parseInt(from.slice(1), 16);
    const toValue = Number.parseInt(to.slice(1), 16);
    const channels = [16, 8, 0].map(shift => {
      const start = (fromValue >> shift) & 255;
      const end = (toValue >> shift) & 255;
      return Math.round(start + (end - start) * progress).toString(16).padStart(2, "0");
    });
    return `#${channels.join("")}`;
  }

  function getTreeColours(seasonId, autumnProgress = getAutumnColourProgress(), colourVariation = 0.5, evergreen = false) {
    const green = ["#1f5b34", "#2e7542", "#3e864b"];
    if (evergreen) return ["#16492e", "#22633a", "#347848"];
    const red = ["#8f2e2e", "#b53d30", "#d45a31"];
    const yellow = ["#a96a24", "#d3942d", "#efc84a"];
    const variation = clamp(Number(colourVariation) || 0, 0, 1);
    const autumn = red.map((colour, index) => mixHexColours(colour, yellow[index], variation));
    return green.map((colour, index) => mixHexColours(colour, autumn[index], autumnProgress));
  }

  function drawTree(ctx, x, y, scale, seasonId, health, autumnProgress = getAutumnColourProgress(), colourVariation, evergreen, deciduousCanopyProgress = getDeciduousCanopyProgress(), burned = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = burned ? "#111111" : "#5a402b";
    ctx.fillRect(-1.5, -3, 3, 8);
    ctx.strokeStyle = burned ? "#1d1b1b" : "#62462f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -14);
    ctx.moveTo(0, -7); ctx.lineTo(-6, -11);
    ctx.moveTo(0, -9); ctx.lineTo(6, -13);
    ctx.moveTo(0, -4); ctx.lineTo(-5, -7);
    ctx.stroke();
    const stableVariation = Number.isFinite(colourVariation)
      ? colourVariation
      : seededNoise(Math.round(x * 19), Math.round(y * 23), state.terrainSeed ^ 0x51ed270b);
    const stableEvergreen = typeof evergreen === "boolean"
      ? evergreen
      : isEvergreenTree(Math.round(x * 19), Math.round(y * 23));
    const leafAmount = burned ? 0 : stableEvergreen ? 1 : clamp(deciduousCanopyProgress, 0, 1);
    if (leafAmount <= 0.001) {
      ctx.restore();
      return;
    }
    const colours = getTreeColours(seasonId, autumnProgress, stableVariation, stableEvergreen);
    ctx.globalAlpha = (0.65 + health * 0.35) * leafAmount;
    ctx.fillStyle = colours[0];
    ctx.beginPath();
    ctx.arc(-4, -7, 6, 0, Math.PI * 2);
    ctx.arc(4, -8, 6.5, 0, Math.PI * 2);
    ctx.arc(0, -13, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colours[1];
    ctx.beginPath();
    ctx.arc(-3, -11, 5, 0, Math.PI * 2);
    ctx.arc(4, -13, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colours[2];
    ctx.beginPath();
    ctx.arc(-1, -15, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStump(ctx, x, y, noise, burned = false) {
    ctx.fillStyle = burned ? "rgba(17,16,16,.94)" : "rgba(80,55,35,.75)";
    ctx.fillRect(x - 2, y - 3, 4, 5);
    ctx.fillStyle = burned ? "rgba(48,43,41,.9)" : "rgba(155,111,63,.7)";
    ctx.beginPath();
    ctx.ellipse(x, y - 3, 3 + noise, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBridgeDeck(ctx, building, position, scale) {
    const horizontal = building.w > building.h;
    const width = building.w * scale;
    const height = building.h * scale;
    const deckInset = scale * 0.17;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.3)";
    ctx.shadowBlur = Math.max(1, scale * 0.12);
    ctx.fillStyle = building.type === "river_bridge" ? "#8e7555" : "#9c7a4d";
    if (horizontal) ctx.fillRect(position.x, position.y + deckInset, width, height - deckInset * 2);
    else ctx.fillRect(position.x + deckInset, position.y, width - deckInset * 2, height);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(62,43,29,.72)";
    ctx.lineWidth = Math.max(0.7, scale * 0.045);
    if (horizontal) {
      for (let offset = scale * 0.18; offset < width; offset += scale * 0.32) {
        ctx.beginPath(); ctx.moveTo(position.x + offset, position.y + deckInset); ctx.lineTo(position.x + offset, position.y + height - deckInset); ctx.stroke();
      }
      ctx.strokeStyle = "#c3a772";
      ctx.lineWidth = Math.max(1, scale * 0.075);
      ctx.beginPath(); ctx.moveTo(position.x, position.y + deckInset * 0.7); ctx.lineTo(position.x + width, position.y + deckInset * 0.7); ctx.moveTo(position.x, position.y + height - deckInset * 0.7); ctx.lineTo(position.x + width, position.y + height - deckInset * 0.7); ctx.stroke();
    } else {
      for (let offset = scale * 0.18; offset < height; offset += scale * 0.32) {
        ctx.beginPath(); ctx.moveTo(position.x + deckInset, position.y + offset); ctx.lineTo(position.x + width - deckInset, position.y + offset); ctx.stroke();
      }
      ctx.strokeStyle = "#c3a772";
      ctx.lineWidth = Math.max(1, scale * 0.075);
      ctx.beginPath(); ctx.moveTo(position.x + deckInset * 0.7, position.y); ctx.lineTo(position.x + deckInset * 0.7, position.y + height); ctx.moveTo(position.x + width - deckInset * 0.7, position.y); ctx.lineTo(position.x + width - deckInset * 0.7, position.y + height); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBuilding(ctx, building, now) {
    const scale = getTileScale();
    const position = worldToCanvas(building.x, building.y);
    const width = building.w * scale;
    const height = building.h * scale;
    const def = BUILDINGS[building.type];
    if (def.bridge) drawBridgeDeck(ctx, building, position, scale);
    ctx.fillStyle = def.category === "nature" || (def.category === "decoration" && Object.values(def.dailyEco || {}).some(amount => amount > 0))
      ? "rgba(79,129,68,.18)"
      : def.category === "industry" ? "rgba(112,80,49,.18)" : "rgba(165,144,96,.13)";
    ctx.fillRect(position.x + scale * 0.08, position.y + scale * 0.08, width - scale * 0.16, height - scale * 0.16);
    ctx.strokeStyle = "rgba(221,231,190,.1)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(position.x + scale * 0.08, position.y + scale * 0.08, width - scale * 0.16, height - scale * 0.16);
    ctx.save();
    ctx.translate(position.x + width / 2, position.y + height / 2);
    ctx.scale(scale / 24, scale / 24);
    // Rotation changes the occupied footprint; building artwork stays upright for readability.
    const visualScale = Math.max(1, Math.min(building.w, building.h) * 0.72);
    ctx.scale(visualScale, visualScale);
    ctx.shadowColor = "rgba(0,0,0,.28)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;

    const house = (wall = "#ad8a58", roof = "#633f32", floors = 1) => {
      ctx.fillStyle = wall;
      ctx.fillRect(-7, floors === 2 ? -5 : -2, 14, floors === 2 ? 13 : 10);
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(-9, floors === 2 ? -5 : -2);
      ctx.lineTo(0, floors === 2 ? -12 : -9);
      ctx.lineTo(9, floors === 2 ? -5 : -2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3f3025";
      ctx.fillRect(-2, 3, 4, 5);
      ctx.fillStyle = "#d9c982";
      ctx.fillRect(-5.5, floors === 2 ? -2 : 1, 2, 2);
      ctx.fillRect(3.5, floors === 2 ? -2 : 1, 2, 2);
    };

    switch (building.type) {
      case "hearth":
        house("#b8935e", "#5b3b2c");
        ctx.fillStyle = "#d68a45";
        ctx.beginPath();
        ctx.arc(7, 6, 2.2 + Math.sin(now / 180) * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "cottage":
        house();
        ctx.fillStyle = "#355d32";
        ctx.beginPath(); ctx.arc(-8, 7, 3, 0, Math.PI * 2); ctx.fill();
        break;
      case "storage":
        house("#9c815b", "#514236");
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "#b98a4f";
        ctx.fillRect(-10, 4, 5, 5);
        ctx.fillRect(5, 3, 5, 6);
        ctx.strokeStyle = "#62472f";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-10, 4, 5, 5);
        ctx.strokeRect(5, 3, 5, 6);
        ctx.beginPath(); ctx.moveTo(-10, 6.5); ctx.lineTo(-5, 6.5); ctx.moveTo(7.5, 3); ctx.lineTo(7.5, 9); ctx.stroke();
        break;
      case "creek_bridge":
      case "river_bridge":
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = building.type === "river_bridge" ? "#d0b37a" : "#c5a469";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-9, -3); ctx.quadraticCurveTo(0, -8, 9, -3); ctx.moveTo(-9, 4); ctx.lineTo(9, 4); ctx.stroke();
        ctx.fillStyle = "#74583d";
        for (let plank = -7; plank <= 7; plank += 3.5) ctx.fillRect(plank, 1.5, 1.2, 5);
        break;
      case "townhouse":
        house("#b59c75", "#54403b", 2);
        ctx.fillStyle = "#d9c982"; ctx.fillRect(-5, 3, 2, 2); ctx.fillRect(3, 3, 2, 2);
        break;
      case "farm":
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "#b99b4e";
        ctx.lineWidth = 2;
        for (let row = -7; row <= 7; row += 4) {
          ctx.beginPath(); ctx.moveTo(-9, row); ctx.lineTo(9, row); ctx.stroke();
        }
        ctx.fillStyle = "#d6b85a";
        for (let i = -7; i <= 7; i += 5) for (let j = -7; j <= 7; j += 7) ctx.fillRect(i, j - 1, 1.5, 3);
        if (getCropPollutionInfo(building).penalty > 0.005) {
          ctx.fillStyle = "rgba(170,86,61,.88)"; ctx.beginPath(); ctx.arc(8,-8,3,0,Math.PI*2); ctx.fill();
          ctx.fillStyle = "#f4dcad"; ctx.font = "bold 5px sans-serif"; ctx.textAlign = "center"; ctx.fillText("!",8,-6.2);
        }
        break;
      case "well":
        ctx.fillStyle = "#9c9a86"; ctx.beginPath(); ctx.ellipse(0, 2, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#427b8a"; ctx.beginPath(); ctx.ellipse(0, 1, 5.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#65492f"; ctx.lineWidth = 1.5; ctx.strokeRect(-6, -7, 12, 8);
        ctx.fillStyle = "#624432"; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(0, -11); ctx.lineTo(8, -6); ctx.closePath(); ctx.fill();
        break;
      case "river_pump":
        ctx.fillStyle = "#5f6a64"; ctx.fillRect(-8, -2, 16, 10);
        ctx.fillStyle = "#39443f"; ctx.fillRect(-5, -8, 10, 6);
        ctx.strokeStyle = "#b7c6bf"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -14); ctx.lineTo(9, -14); ctx.lineTo(9, 3); ctx.stroke();
        ctx.fillStyle = "#5f9bad"; ctx.beginPath(); ctx.arc(0, 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#d5e5de"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, 3); ctx.lineTo(2, 3); ctx.moveTo(0, 1); ctx.lineTo(0, 5); ctx.stroke();
        break;
      case "lumber":
        house("#8e714b", "#4d392a");
        ctx.strokeStyle = "#ba8250"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-9, 7); ctx.lineTo(0, 7); ctx.moveTo(-7, 10); ctx.lineTo(3, 10); ctx.stroke();
        break;
      case "wood_farm": {
        ctx.shadowColor = "transparent";
        normaliseWoodFarmPlots(building, state);
        ctx.fillStyle = "rgba(90,77,42,.42)";
        ctx.fillRect(-10, -10, 20, 20);
        ctx.strokeStyle = "rgba(194,166,91,.48)";
        ctx.lineWidth = 0.45;
        for (let line = -5; line <= 5; line += 5) {
          ctx.beginPath(); ctx.moveTo(line, -10); ctx.lineTo(line, 10); ctx.moveTo(-10, line); ctx.lineTo(10, line); ctx.stroke();
        }
        for (let row = 0; row < 4; row++) {
          for (let column = 0; column < 4; column++) {
            const index = row * 4 + column;
            const growth = clamp(getWoodFarmPlotAge(building, index) / WOOD_FARM_GROWTH_DAYS, 0, 1);
            const treeX = -7.5 + column * 5;
            const treeY = -7.5 + row * 5;
            const plotEvergreen = isEvergreenTree(Math.round(treeX * 19), Math.round(treeY * 23));
            const plotLeafAmount = plotEvergreen ? 1 : getDeciduousCanopyProgress();
            if (growth < 0.16) {
              ctx.strokeStyle = "#567846";
              ctx.lineWidth = 0.7;
              ctx.beginPath(); ctx.moveTo(treeX, treeY); ctx.lineTo(treeX, treeY - 2.8); ctx.stroke();
              if (plotLeafAmount > 0.001) {
                ctx.save();
                ctx.globalAlpha = plotLeafAmount;
                ctx.fillStyle = plotEvergreen ? "#347848" : "#6c9957";
                ctx.beginPath(); ctx.ellipse(treeX - 0.8, treeY - 2.6, 1.1, 0.55, -0.45, 0, Math.PI * 2); ctx.ellipse(treeX + 0.8, treeY - 1.9, 1.1, 0.55, 0.45, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
              }
            } else {
              drawTree(ctx, treeX, treeY, 0.11 + growth * 0.16, getSeason().id, 0.78 + growth * 0.22);
            }
          }
        }
        break;
      }
      case "hunter":
        house("#806f4d", "#39462e");
        ctx.strokeStyle = "#d3b477"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(8, -1, 4, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        break;
      case "quarry":
        ctx.fillStyle = "#777d77";
        [[-6,5,5],[1,4,7],[5,-3,5],[-4,-4,6]].forEach(([rx,ry,r]) => {
          ctx.beginPath(); ctx.moveTo(rx-r,ry+2); ctx.lineTo(rx-r/2,ry-r); ctx.lineTo(rx+r,ry-r/2); ctx.lineTo(rx+r/2,ry+r); ctx.closePath(); ctx.fill();
        });
        ctx.strokeStyle = "#443c31"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8,-9); ctx.lineTo(8,8); ctx.stroke();
        break;
      case "forester":
        house("#8c764e", "#405037");
        ctx.shadowColor = "transparent";
        drawTree(ctx, 7, 5, 0.55, getSeason().id, 1);
        break;
      case "sanctuary":
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "rgba(183,222,132,.65)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 1, 10, 0, Math.PI * 2); ctx.stroke();
        drawTree(ctx, 0, 6, 0.85, getSeason().id, 1);
        ctx.fillStyle = "#c8dd83"; ctx.beginPath(); ctx.arc(-7,-5,1.3,0,Math.PI*2); ctx.arc(8,2,1.3,0,Math.PI*2); ctx.fill();
        break;
      case "orchard":
        ctx.shadowColor = "transparent";
        drawTree(ctx, -6, 5, .55, getSeason().id, 1); drawTree(ctx, 5, 6, .58, getSeason().id, 1); drawTree(ctx, 0, -1, .5, getSeason().id, 1);
        if (getDeciduousCanopyProgress() > 0.001) {
          ctx.save();
          ctx.globalAlpha = getDeciduousCanopyProgress();
          ctx.fillStyle = "#d59b53"; ctx.beginPath(); ctx.arc(-8,-3,1,0,Math.PI*2); ctx.arc(7,-4,1,0,Math.PI*2); ctx.arc(1,-8,1,0,Math.PI*2); ctx.fill();
          ctx.restore();
        }
        if (getCropPollutionInfo(building).penalty > 0.005) {
          ctx.fillStyle = "rgba(170,86,61,.88)"; ctx.beginPath(); ctx.arc(8,-8,3,0,Math.PI*2); ctx.fill();
          ctx.fillStyle = "#f4dcad"; ctx.font = "bold 5px sans-serif"; ctx.textAlign = "center"; ctx.fillText("!",8,-6.2);
        }
        break;
      case "apiary":
        ctx.fillStyle = "#c89c48"; ctx.fillRect(-8,-2,7,9); ctx.fillRect(2,-4,7,11);
        ctx.strokeStyle = "#5c4930"; ctx.lineWidth = 1; for (let row=-1;row<7;row+=3) {ctx.beginPath();ctx.moveTo(-8,row);ctx.lineTo(-1,row);ctx.moveTo(2,row);ctx.lineTo(9,row);ctx.stroke();}
        ctx.fillStyle="#e0c65e";ctx.beginPath();ctx.arc(-8,-7,1.3,0,Math.PI*2);ctx.arc(8,8,1.3,0,Math.PI*2);ctx.fill();
        break;
      case "rain_garden":
        ctx.shadowColor = "transparent"; ctx.fillStyle="#3e7680";ctx.beginPath();ctx.ellipse(0,2,10,7,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#7fa970";ctx.lineWidth=1.4;for(let i=-8;i<=8;i+=4){ctx.beginPath();ctx.moveTo(i,5);ctx.lineTo(i-1,-6+Math.abs(i)*.2);ctx.stroke();}
        ctx.fillStyle="#b7d18a";ctx.beginPath();ctx.arc(-3,0,1.2,0,Math.PI*2);ctx.arc(4,3,1,0,Math.PI*2);ctx.fill();
        break;
      case "compost":
        ctx.fillStyle="#6f5233";ctx.fillRect(-10,-5,8,13);ctx.fillRect(2,-5,8,13);ctx.strokeStyle="#b18a52";ctx.lineWidth=1.5;ctx.strokeRect(-10,-5,8,13);ctx.strokeRect(2,-5,8,13);
        ctx.fillStyle="#365d31";ctx.beginPath();ctx.arc(-6,-5,4,Math.PI,0);ctx.arc(6,-5,4,Math.PI,0);ctx.fill();
        break;
      case "granary":
        house("#b69b6c", "#5c4030"); ctx.fillStyle="#6f7a67";ctx.beginPath();ctx.ellipse(9,2,5,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#4f5b50";ctx.fillRect(5,1,8,8);
        break;
      case "barn":
        house("#a66f45", "#593b2a");
        ctx.fillStyle = "#d2b86d"; ctx.fillRect(-8, -1, 16, 9);
        ctx.strokeStyle = "#6d482e"; ctx.lineWidth = 1.4;
        for (let x = -6; x <= 6; x += 4) { ctx.beginPath(); ctx.moveTo(x, -1); ctx.lineTo(x, 8); ctx.stroke(); }
        ctx.fillStyle = "#4d3527"; ctx.fillRect(-3, 2, 6, 6);
        break;
      case "water_tank":
        ctx.fillStyle = "#758a8e"; ctx.beginPath(); ctx.ellipse(0, 1, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#4c8d9d"; ctx.beginPath(); ctx.ellipse(0, -1, 7.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#c0d1cb"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 1, 10, 0, Math.PI * 2); ctx.stroke();
        break;
      case "timber_yard":
        ctx.fillStyle = "#80543a"; ctx.fillRect(-10, -2, 20, 10);
        ctx.strokeStyle = "#4b3226"; ctx.lineWidth = 2;
        for (let y = -1; y <= 7; y += 3) { ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(10, y); ctx.stroke(); }
        ctx.fillStyle = "#b37a48"; ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(-7, -8); ctx.lineTo(7, -8); ctx.lineTo(11, -2); ctx.closePath(); ctx.fill();
        break;
      case "stone_depot":
        ctx.fillStyle = "#6f7774";
        [[-6, 4, 5], [0, 3, 7], [6, 5, 4], [-3, -2, 4], [5, -3, 3]].forEach(([x, y, radius]) => { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); });
        ctx.strokeStyle = "#b3b5a7"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, 9); ctx.lineTo(10, 9); ctx.stroke();
        break;
      case "large_storage":
        house("#9c815b", "#514236", 2);
        ctx.fillStyle = "#bd9156"; ctx.fillRect(-11, 2, 5, 6); ctx.fillRect(6, 1, 5, 7);
        ctx.strokeStyle = "#62472f"; ctx.lineWidth = 1; ctx.strokeRect(-11, 2, 5, 6); ctx.strokeRect(6, 1, 5, 7);
        break;
      case "reservoir":
        ctx.fillStyle="#777f76";ctx.beginPath();ctx.ellipse(0,0,11,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#477988";ctx.beginPath();ctx.ellipse(0,-1,8.5,5.5,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#b5a77c";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-10,-8);ctx.lineTo(10,-8);ctx.moveTo(-7,-11);ctx.lineTo(7,-11);ctx.stroke();
        break;
      case "market":
        ctx.fillStyle = "#c6a66d"; ctx.fillRect(-9, -2, 18, 10);
        ctx.fillStyle = "#8d493e"; ctx.beginPath(); ctx.moveTo(-10,-2); ctx.lineTo(-7,-8); ctx.lineTo(7,-8); ctx.lineTo(10,-2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#d6be77"; for(let i=-6;i<=6;i+=6) ctx.fillRect(i,1,3,3);
        break;
      case "windmill": {
        ctx.fillStyle = "#b7a77d"; ctx.beginPath(); ctx.moveTo(-5,9); ctx.lineTo(-3,-6); ctx.lineTo(3,-6); ctx.lineTo(6,9); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#e0d5b3"; ctx.lineWidth = 1.6;
        const angle = now / 900;
        for(let i=0;i<4;i++) { ctx.save(); ctx.rotate(angle + i*Math.PI/2); ctx.beginPath(); ctx.moveTo(0,-1); ctx.lineTo(0,-10); ctx.stroke(); ctx.restore(); }
        ctx.fillStyle="#65472f"; ctx.beginPath();ctx.arc(0,-1,2,0,Math.PI*2);ctx.fill();
        break;
      }
      case "school":
        house("#b8a47c", "#526249");
        ctx.fillStyle = "#d7c477"; ctx.fillRect(-1,-12,2,5); ctx.beginPath();ctx.arc(0,-12,2,0,Math.PI*2);ctx.fill();
        break;
      case "playground":
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "rgba(92,142,70,.72)"; ctx.beginPath(); ctx.ellipse(0,3,11,7,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#b99055"; ctx.lineWidth = 1.7;
        ctx.beginPath(); ctx.moveTo(-8,7); ctx.lineTo(-5,-7); ctx.lineTo(-1,7); ctx.moveTo(-5,-7); ctx.lineTo(4,-7); ctx.lineTo(8,7); ctx.stroke();
        ctx.strokeStyle = "#d4c594"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(1,-7); ctx.lineTo(1,2); ctx.moveTo(4,-7); ctx.lineTo(4,2); ctx.stroke();
        ctx.fillStyle = "#8a573f"; ctx.fillRect(0,2,5,1.8);
        ctx.fillStyle = "#d8b66d"; ctx.beginPath(); ctx.arc(-7,7,3.5,Math.PI,0); ctx.fill();
        break;
      case "park":
        ctx.shadowColor = "transparent";
        drawTree(ctx,-4,5,.62,getSeason().id,1); drawTree(ctx,6,7,.48,getSeason().id,1);
        ctx.strokeStyle="#b79a6c";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,8);ctx.quadraticCurveTo(0,0,9,8);ctx.stroke();
        break;
      case "flower_patch":
        ctx.shadowColor = "transparent"; ctx.fillStyle = "#4e803d"; ctx.beginPath(); ctx.arc(0, 4, 8, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#e4bc62"; for (let i = -5; i <= 5; i += 5) { ctx.beginPath(); ctx.arc(i, -1, 3, 0, Math.PI * 2); ctx.fill(); }
        break;
      case "native_shrub":
        ctx.shadowColor = "transparent"; ctx.fillStyle = "#3d733d"; ctx.beginPath(); ctx.arc(-4, 3, 5, 0, Math.PI * 2); ctx.arc(3, 1, 6, 0, Math.PI * 2); ctx.fill();
        break;
      case "bird_bath":
        ctx.fillStyle = "#a7a99d"; ctx.beginPath(); ctx.ellipse(0, -1, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-2, 1, 4, 8);
        ctx.fillStyle = "#5d9db2"; ctx.beginPath(); ctx.ellipse(0, -1, 5.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        break;
      case "bench":
        ctx.fillStyle = "#8b603b"; ctx.fillRect(-9, -1, 18, 3); ctx.fillRect(-7, 3, 2, 6); ctx.fillRect(5, 3, 2, 6); break;
      case "lantern":
        ctx.strokeStyle = "#594634"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, -5); ctx.stroke(); ctx.fillStyle = "#f0ca6a"; ctx.fillRect(-3, -9, 6, 5); break;
      case "stone_statue":
        ctx.fillStyle = "#8c8c81"; ctx.fillRect(-5, -8, 10, 15); ctx.fillStyle = "#aaa99c"; ctx.beginPath(); ctx.arc(0, -11, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#6b6d66"; ctx.fillRect(-9, 7, 18, 3); break;
      case "clinic":
        house("#c2bca6", "#566960");
        ctx.fillStyle="#b65f56";ctx.fillRect(-1,-1,2,6);ctx.fillRect(-3,1,6,2);
        break;
      case "workshop":
        ctx.fillStyle="#8c7d67";ctx.fillRect(-9,-3,18,12);ctx.fillStyle="#5a4d43";ctx.beginPath();ctx.moveTo(-10,-3);ctx.lineTo(-4,-9);ctx.lineTo(1,-3);ctx.lineTo(7,-9);ctx.lineTo(10,-3);ctx.closePath();ctx.fill();
        ctx.fillStyle="#5b5247";ctx.fillRect(5,-12,4,10);
        ctx.fillStyle="rgba(170,178,164,.4)";ctx.beginPath();ctx.arc(7,-15,3+Math.sin(now/600),0,Math.PI*2);ctx.fill();
        break;
      case "townhall":
        ctx.fillStyle="#b8aa8a";ctx.fillRect(-9,-4,18,13);ctx.fillStyle="#58433c";ctx.beginPath();ctx.moveTo(-11,-4);ctx.lineTo(0,-11);ctx.lineTo(11,-4);ctx.closePath();ctx.fill();
        ctx.strokeStyle="#d3c590";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,-18);ctx.stroke();
        ctx.fillStyle="#8fb96e";ctx.beginPath();ctx.moveTo(1,-18);ctx.lineTo(8,-15);ctx.lineTo(1,-13);ctx.closePath();ctx.fill();
        ctx.fillStyle="#4c4035";ctx.fillRect(-2,2,4,7);
        break;
    }
    ctx.restore();
  }

  function drawAmbientWildlife(ctx, now) {
    const count = Math.floor(state.ecosystem.wildlife / 18);
    for (let i = 0; i < count; i++) {
      const baseX = WORLD_CENTER - 17 + seededNoise(i, 2, state.terrainSeed) * 34;
      const baseY = WORLD_CENTER - 15 + seededNoise(i, 9, state.terrainSeed) * 30;
      const position = worldToCanvas(baseX + Math.sin(now / 6500 + i) * 0.5, baseY + Math.cos(now / 7300 + i * 2) * 0.35);
      const x = position.x;
      const y = position.y;
      if (x < -10 || y < -10 || x > dom.gameCanvas.width + 10 || y > dom.gameCanvas.height + 10) continue;
      const animalScale = clamp(getTileScale() / 24, .55, 1.5);
      ctx.save(); ctx.translate(x,y); ctx.scale(animalScale,animalScale);
      ctx.fillStyle = "rgba(92,67,43,.72)";
      ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(92,67,43,.72)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-2,1);ctx.lineTo(-2,4);ctx.moveTo(1,1);ctx.lineTo(1,4);ctx.stroke();ctx.restore();
    }
  }

  function resetVillagers() {
    villagers.length = 0;
    villagerSignature = "";
    rosterDirty = true;
    runtimeIndexState = null;
    lastVillagerDataUpdate = 0;
    lastResidentLifecycleHour = -1;
    nextResidentExpiry = Infinity;
    remoteLoggingTargetCache.clear();
    standingWildTreeCountCache = null;
    hoveredVillagerId = null;
    if (dom.gameCanvas) {
      dom.gameCanvas.dataset.villagers = "0";
      delete dom.gameCanvas.dataset.firstVillager;
      delete dom.gameCanvas.dataset.firstWorker;
    }
  }

  function isBuildingIconTile(building, x, y) {
    if (!building || x < building.x || x >= building.x + building.w || y < building.y || y >= building.y + building.h) return false;
    if (BUILDINGS[building.type]?.bridge) return false;
    const iconWidth = building.w >= 4 ? 2 : 1;
    const iconHeight = building.h >= 4 ? 2 : 1;
    const iconX = building.x + Math.floor((building.w - iconWidth) / 2);
    const iconY = building.y + Math.floor((building.h - iconHeight) / 2);
    return x >= iconX && x < iconX + iconWidth && y >= iconY && y < iconY + iconHeight;
  }

  function isVillagerWalkableForState(target, x, y) {
    if (!inWorld(x, y)) return false;
    const building = getBuildingAtForState(target, x, y);
    if (getWaterwayTypeForState(target, x, y)) return Boolean(building && BUILDINGS[building.type]?.bridge);
    if (!isClearingForState(target, x, y)) return false;
    if (building && BUILDINGS[building.type]?.bridge) return true;
    return !building || !isBuildingIconTile(building, x, y);
  }

  function isVillagerWalkable(x, y) {
    return isVillagerWalkableForState(state, x, y);
  }

  function findVillagerSpawn(index) {
    for (let attempt = 0; attempt < 260; attempt++) {
      const angle = seededNoise(index * 7 + attempt, 31, state.terrainSeed ^ 0x8f1bbcdc) * Math.PI * 2;
      const radius = 2 + seededNoise(index + 19, attempt * 5, state.terrainSeed ^ 0x45d9f3b) * 9.5;
      const x = Math.floor(WORLD_CENTER + Math.cos(angle) * radius);
      const y = Math.floor(WORLD_CENTER + Math.sin(angle) * radius * 0.82);
      if (isVillagerWalkable(x, y)) return { x, y };
    }
    for (let y = 39; y <= 61; y++) {
      for (let x = 38; x <= 62; x++) if (isVillagerWalkable(x, y)) return { x, y };
    }
    return { x: 48, y: 48 };
  }

  function createVillager(record, index) {
    const spawn = findVillagerSpawn(record.id + index);
    return {
      id: record.id,
      personId: record.id,
      age: record.ageGroup,
      ageRank: index,
      tileX: spawn.x,
      tileY: spawn.y,
      nextX: spawn.x,
      nextY: spawn.y,
      progress: 0,
      wait: seededNoise(record.id, 17, state.terrainSeed) * 0.8,
      steps: 0,
      speed: 0.78 * VILLAGER_SPEED_MULTIPLIER,
      phase: seededNoise(record.id, 73, state.terrainSeed) * Math.PI * 2,
      colour: Math.floor(seededNoise(record.id, 101, state.terrainSeed) * 4),
      targetPurpose: "wander",
      targetBuildingId: null,
      path: [],
      pathTargetKey: "",
      indoors: false,
      indoorBuildingId: null
    };
  }

  function syncVillagers() {
    const visibleRecords = state.people.slice(0, 60);
    const signature = `${state.terrainSeed}:${visibleRecords.map(person => `${person.id}-${person.ageGroup}`).join(",")}`;
    if (signature === villagerSignature) {
      updateVillagerDataAttributes();
      return;
    }
    villagerSignature = signature;

    const existing = new Map(villagers.map(person => [person.personId, person]));
    const nextVillagers = visibleRecords.map((record, index) => existing.get(record.id) || createVillager(record, index));
    villagers.splice(0, villagers.length, ...nextVillagers);
    const ageRanks = { child: 0, adult: 0, elder: 0 };
    for (const person of villagers) {
      const record = getPersonById(person.personId);
      person.age = record?.ageGroup || "adult";
      person.ageRank = ageRanks[person.age]++;
      const baseSpeed = person.age === "child" ? 0.98 : person.age === "elder" ? 0.57 : 0.78;
      person.speed = baseSpeed * VILLAGER_SPEED_MULTIPLIER;
    }
    if (dom.gameCanvas) dom.gameCanvas.dataset.villagers = String(villagers.length);
    updateVillagerDataAttributes(true);
  }

  function updateVillagerDataAttributes(force = false) {
    if (!dom.gameCanvas) return;
    const now = performance.now();
    if (!force && now - lastVillagerDataUpdate < 250) return;
    lastVillagerDataUpdate = now;
    dom.gameCanvas.dataset.villagers = String(villagers.length);
    dom.gameCanvas.dataset.villagerSpeedMultiplier = String(VILLAGER_SPEED_MULTIPLIER);
    dom.gameCanvas.dataset.villagerMovementSpeed = `${state.speed}x`;
    dom.gameCanvas.dataset.villagerPathfinding = "breadth-first-obstacle-aware";
    dom.gameCanvas.dataset.schoolTeachers = String(state.people.filter(person => getBuildingById(person.workBuildingId)?.type === "school").length);
    dom.gameCanvas.dataset.enrolledPupils = String(state.people.filter(person => person.ageGroup === "child" && person.schoolBuildingId).length);
    dom.gameCanvas.dataset.pupilsInSchool = String(villagers.filter(person => person.indoors && getBuildingById(person.indoorBuildingId)?.type === "school").length);
    dom.gameCanvas.dataset.homedVillagers = String(state.people.filter(person => getBuildingById(person.homeBuildingId)).length);
    dom.gameCanvas.dataset.nightHomeTargets = String(villagers.filter(person => person.targetPurpose === "home").length);
    dom.gameCanvas.dataset.villagersIndoors = String(villagers.filter(person => person.indoors).length);
    dom.gameCanvas.dataset.villagersOutdoors = String(villagers.filter(person => !person.indoors).length);
    dom.gameCanvas.dataset.villagersAtHome = String(villagers.filter(person => {
      const resident = getPersonById(person.personId);
      return resident?.homeBuildingId && getBuildingAt(person.tileX, person.tileY)?.id === resident.homeBuildingId;
    }).length);
    dom.gameCanvas.dataset.villagersOnBuildingPaths = String(villagers.filter(person => {
      if (person.indoors) return false;
      const building = getBuildingAt(person.tileX, person.tileY);
      return building && !isBuildingIconTile(building, person.tileX, person.tileY);
    }).length);
    dom.gameCanvas.dataset.villagersInForest = String(villagers.filter(person => !isClearing(person.tileX, person.tileY) && !getWaterwayType(person.tileX, person.tileY)).length);
    dom.gameCanvas.dataset.villagersOnBridges = String(villagers.filter(person => {
      const building = getBuildingAt(person.tileX, person.tileY);
      return Boolean(building && BUILDINGS[building.type]?.bridge);
    }).length);
    dom.gameCanvas.dataset.villagersOnIcons = String(villagers.filter(person => {
      const building = getBuildingAt(person.tileX, person.tileY);
      return building && isBuildingIconTile(building, person.tileX, person.tileY);
    }).length);
    const firstResident = villagers.find(person => !person.indoors);
    const firstWorker = villagers.find(person => !person.indoors && getPersonById(person.personId)?.workBuildingId);
    if (firstResident) {
      const world = getVillagerWorldPosition(firstResident);
      const record = getPersonById(firstResident.personId);
      const home = getBuildingById(record.homeBuildingId);
      dom.gameCanvas.dataset.firstVillager = JSON.stringify({ id: record.id, name: record.name, x: world.x, y: world.y, homeBuildingId: home?.id || null, home: home ? BUILDINGS[home.type].name : null });
    } else {
      delete dom.gameCanvas.dataset.firstVillager;
    }
    if (firstWorker) {
      const world = getVillagerWorldPosition(firstWorker);
      const record = getPersonById(firstWorker.personId);
      dom.gameCanvas.dataset.firstWorker = JSON.stringify({ id: record.id, name: record.name, x: world.x, y: world.y });
    } else {
      delete dom.gameCanvas.dataset.firstWorker;
    }
  }

  function buildingPathTiles(building) {
    const options = [];
    for (let y = building.y; y < building.y + building.h; y++) {
      for (let x = building.x; x < building.x + building.w; x++) {
        if (isVillagerWalkable(x, y)) options.push({ x, y, inside: true });
      }
    }
    return options;
  }

  function buildingApproachTile(building, person) {
    const options = buildingPathTiles(building);
    for (let x = building.x - 1; x <= building.x + building.w; x++) {
      if (isVillagerWalkable(x, building.y - 1)) options.push({ x, y: building.y - 1 });
      if (isVillagerWalkable(x, building.y + building.h)) options.push({ x, y: building.y + building.h });
    }
    for (let y = building.y; y < building.y + building.h; y++) {
      if (isVillagerWalkable(building.x - 1, y)) options.push({ x: building.x - 1, y });
      if (isVillagerWalkable(building.x + building.w, y)) options.push({ x: building.x + building.w, y });
    }
    if (!options.length) return null;
    return options.reduce((best, option) => {
      const distance = Math.abs(option.x - person.tileX) + Math.abs(option.y - person.tileY);
      return !best || distance < best.distance ? { ...option, distance } : best;
    }, null);
  }

  function buildingHomeTile(building, person) {
    const indoorPaths = buildingPathTiles(building);
    if (!indoorPaths.length) return buildingApproachTile(building, person);
    return indoorPaths[Math.abs(person.personId || person.id) % indoorPaths.length];
  }

  function farmWorkTile(building, person) {
    const tiles = buildingPathTiles(building);
    if (!tiles.length) return buildingApproachTile(building, person);
    return tiles[Math.abs(person.personId * 7 + person.steps * 3) % tiles.length];
  }

  function getVillageHour(target = state) {
    return ((0.25 + (Number(target?.dayProgress) || 0)) % 1) * 24;
  }

  function isVillagerNight(target = state) {
    const hour = getVillageHour(target);
    return hour < STAFFED_SHIFT_START_HOUR || hour >= getStaffedShiftEndHour(target);
  }

  function villagerDestination(person) {
    const record = getPersonById(person.personId);
    if (!record) return null;
    const hour = getVillageHour();
    let preferred = [];
    let purpose = "wander";
    if (hour >= STAFFED_SHIFT_START_HOUR && hour < getStaffedShiftEndHour()) {
      if (record.ageGroup === "child") {
        const school = getBuildingById(record.schoolBuildingId);
        if (hour < 15 && school) {
          preferred = [school];
          purpose = "school";
        }
        if (!preferred.length) {
          preferred = state.buildings.filter(building => building.type === "playground");
          purpose = "play";
        }
      } else if (record.workBuildingId) {
        if (record.tripPhase === "deliver" && record.carriedAmount > 0) {
          preferred = state.buildings.filter(building => ["granary", "market", "hearth"].includes(building.type));
          purpose = "deliver";
        } else {
          const workplace = getBuildingById(record.workBuildingId);
          if (workplace) preferred = [workplace];
          purpose = "work";
        }
      } else if (record.ageGroup === "adult") {
        preferred = state.buildings.filter(building => ["market", "park", "hearth"].includes(building.type));
        purpose = "wander";
      } else {
        preferred = state.buildings.filter(building => ["park", "market", "hearth", "rain_garden"].includes(building.type));
        purpose = "rest";
      }
    } else {
      const assignedHome = getBuildingById(record.homeBuildingId);
      preferred = assignedHome ? [assignedHome] : [];
      purpose = "home";
    }
    if (!preferred.length) preferred = state.buildings.filter(building => building.type === "hearth");
    const choiceNoise = seededNoise(person.id + person.steps, state.day, state.terrainSeed ^ 0xa24baed4);
    const building = preferred[Math.floor(choiceNoise * preferred.length) % Math.max(1, preferred.length)];
    const approach = building
      ? purpose === "home" || purpose === "school" ? buildingHomeTile(building, person) : purpose === "work" && building.type === "farm" ? farmWorkTile(building, person) : buildingApproachTile(building, person)
      : null;
    return approach ? { ...approach, buildingId: building.id, purpose } : null;
  }

  function handleVillagerArrival(person, target) {
    const record = getPersonById(person.personId);
    if (!record) return;
    if (target.purpose === "work" && record.workBuildingId === target.buildingId) {
      const workplace = getBuildingById(record.workBuildingId);
      if (workplace?.type === "farm") {
        record.carriedItem = "";
        record.carriedAmount = 0;
        record.tripPhase = "work";
        return;
      }
      const item = CARRY_ITEMS[workplace?.type] || "supplies";
      record.carriedItem = item;
      record.carriedAmount = 1 + Math.floor(seededNoise(record.id, person.steps + state.day * 17, state.terrainSeed) * record.carryCapacity);
      record.tripPhase = "deliver";
    } else if (target.purpose === "school" && record.ageGroup === "child" && record.schoolBuildingId === target.buildingId) {
      person.indoors = true;
      person.indoorBuildingId = target.buildingId;
      person.nextX = person.tileX;
      person.nextY = person.tileY;
      person.progress = 0;
      if (hoveredVillagerId === record.id) hoveredVillagerId = null;
    } else if (target.purpose === "deliver") {
      record.carriedItem = "";
      record.carriedAmount = 0;
      record.tripPhase = "work";
    } else if (target.purpose === "home") {
      const home = getBuildingById(target.buildingId);
      if (home && BUILDINGS[home.type]?.housing) {
        person.indoors = true;
        person.indoorBuildingId = home.id;
        person.nextX = person.tileX;
        person.nextY = person.tileY;
        person.progress = 0;
        if (hoveredVillagerId === record.id) hoveredVillagerId = null;
      }
    }
  }

  function findVillagerPath(startX, startY, targetX, targetY) {
    const start = tileIndex(startX, startY);
    const goal = tileIndex(targetX, targetY);
    if (start === goal) return [];
    const previous = new Int32Array(WORLD_SIZE * WORLD_SIZE);
    previous.fill(-2);
    previous[start] = -1;
    const queue = [start];
    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      if (current === goal) break;
      const x = current % WORLD_SIZE;
      const y = Math.floor(current / WORLD_SIZE);
      for (const [offsetX, offsetY] of VILLAGER_PATH_DIRECTIONS) {
        const nextX = x + offsetX;
        const nextY = y + offsetY;
        if (!inWorld(nextX, nextY)) continue;
        const next = tileIndex(nextX, nextY);
        if (previous[next] !== -2 || !isVillagerWalkable(nextX, nextY)) continue;
        previous[next] = current;
        queue.push(next);
      }
    }
    if (previous[goal] === -2) return [];
    const path = [];
    for (let current = goal; current !== start; current = previous[current]) path.push(current);
    return path.reverse();
  }

  function getVillagerPathStep(person, target) {
    if (!target) return null;
    const targetKey = `${target.x},${target.y},${target.buildingId || ""},${target.purpose}`;
    const current = tileIndex(person.tileX, person.tileY);
    const firstStep = person.path?.[0];
    const pathStartsHere = !Number.isInteger(firstStep)
      || Math.abs(firstStep % WORLD_SIZE - person.tileX) + Math.abs(Math.floor(firstStep / WORLD_SIZE) - person.tileY) <= 1;
    if (person.pathTargetKey !== targetKey || !Array.isArray(person.path) || !pathStartsHere) {
      person.path = findVillagerPath(person.tileX, person.tileY, target.x, target.y);
      person.pathTargetKey = targetKey;
    }
    while (person.path[0] === current) person.path.shift();
    const next = person.path[0];
    return Number.isInteger(next) ? { x: next % WORLD_SIZE, y: Math.floor(next / WORLD_SIZE) } : null;
  }

  function chooseVillagerStep(person) {
    const neighbours = [
      { x: person.tileX + 1, y: person.tileY },
      { x: person.tileX - 1, y: person.tileY },
      { x: person.tileX, y: person.tileY + 1 },
      { x: person.tileX, y: person.tileY - 1 }
    ].filter(tile => isVillagerWalkable(tile.x, tile.y));
    if (!neighbours.length) {
      person.wait = 0.8;
      return;
    }
    const target = villagerDestination(person);
    if (target && person.tileX === target.x && person.tileY === target.y) {
      handleVillagerArrival(person, target);
      person.nextX = person.tileX;
      person.nextY = person.tileY;
      person.targetPurpose = target.purpose;
      person.targetBuildingId = target.buildingId;
      person.path = [];
      person.pathTargetKey = "";
      person.progress = 0;
      person.steps += 1;
      const workplace = target.purpose === "work" ? getBuildingById(target.buildingId) : null;
      person.wait = workplace?.type === "farm"
        ? 1.1 + seededNoise(person.id, person.steps, state.terrainSeed) * 1.2
        : 0.7 + seededNoise(person.id, person.steps, state.terrainSeed) * 1.6;
      return;
    }
    const wander = target?.purpose === "wander" && seededNoise(person.id, person.steps + state.day * 11, state.terrainSeed) < 0.18;
    const pathStep = wander ? null : getVillagerPathStep(person, target);
    const choice = pathStep || wander || !target
      ? neighbours[Math.floor(seededNoise(person.steps, person.id * 13, state.terrainSeed) * neighbours.length) % neighbours.length]
      : neighbours.reduce((best, tile) => {
          const distance = Math.abs(tile.x - target.x) + Math.abs(tile.y - target.y);
          const variation = seededNoise(tile.x + person.steps, tile.y + person.id, state.terrainSeed) * 0.7;
          const score = distance + variation;
          return !best || score < best.score ? { ...tile, score } : best;
        }, null);
    person.nextX = choice.x;
    person.nextY = choice.y;
    person.targetPurpose = target?.purpose || "wander";
    person.targetBuildingId = target?.buildingId || null;
    person.steps += 1;
  }

  function updateVillagers(deltaMs) {
    syncVillagers();
    const seconds = Math.min(0.25, deltaMs / 1000);
    for (const person of villagers) {
      if (person.indoors) {
        const record = getPersonById(person.personId);
        const indoorHome = getBuildingById(person.indoorBuildingId);
        const assignedHome = getBuildingById(record?.homeBuildingId);
        const assignedSchool = getBuildingById(record?.schoolBuildingId);
        const stillInHome = indoorHome
          && BUILDINGS[indoorHome.type]?.housing
          && getBuildingAt(person.tileX, person.tileY)?.id === indoorHome.id
          && (!assignedHome || assignedHome.id === indoorHome.id);
        const stillInSchool = indoorHome
          && indoorHome.type === "school"
          && record?.ageGroup === "child"
          && assignedSchool?.id === indoorHome.id
          && getBuildingAt(person.tileX, person.tileY)?.id === indoorHome.id;
        const inSchoolHours = getVillageHour() >= STAFFED_SHIFT_START_HOUR && getVillageHour() < Math.min(15, getStaffedShiftEndHour());
        if ((isVillagerNight() && stillInHome) || (inSchoolHours && stillInSchool)) {
          person.nextX = person.tileX;
          person.nextY = person.tileY;
          person.progress = 0;
          person.wait = 0;
          continue;
        }
        person.indoors = false;
        person.indoorBuildingId = null;
        person.nextX = person.tileX;
        person.nextY = person.tileY;
        person.progress = 0;
        person.wait = 0;
        person.targetPurpose = "wander";
        person.targetBuildingId = null;
        person.path = [];
        person.pathTargetKey = "";
      }
      if (!isVillagerWalkable(person.tileX, person.tileY)) {
        const spawn = findVillagerSpawn(person.id + person.steps);
        person.tileX = person.nextX = spawn.x;
        person.tileY = person.nextY = spawn.y;
        person.progress = 0;
        person.path = [];
        person.pathTargetKey = "";
      }
      if (person.wait > 0) {
        person.wait -= seconds * state.speed;
        continue;
      }
      if (!isVillagerWalkable(person.nextX, person.nextY)) {
        person.nextX = person.tileX;
        person.nextY = person.tileY;
        person.progress = 0;
      }
      if (person.nextX === person.tileX && person.nextY === person.tileY) chooseVillagerStep(person);
      if (person.indoors) continue;
      person.progress += seconds * person.speed * state.speed;
      if (person.progress >= 1) {
        person.tileX = person.nextX;
        person.tileY = person.nextY;
        person.progress %= 1;
        chooseVillagerStep(person);
      }
    }
    if (dom.gameCanvas) {
      const motion = villagers.reduce((sum, person) => sum + person.tileX + person.tileY * 0.37 + person.progress, 0);
      dom.gameCanvas.dataset.villagerMotion = motion.toFixed(3);
    }
  }

  function getVillagerWorldPosition(person) {
    return {
      x: person.tileX + 0.5 + (person.nextX - person.tileX) * person.progress,
      y: person.tileY + 0.5 + (person.nextY - person.tileY) * person.progress
    };
  }

  function findVillagerAtCanvasPoint(canvasX, canvasY) {
    if (selectedBuilding || activeTool !== "inspect") return null;
    const radius = Math.max(10, getTileScale() * 0.48);
    let closest = null;
    for (const person of villagers) {
      if (person.indoors) continue;
      const world = getVillagerWorldPosition(person);
      const screen = worldToCanvas(world.x, world.y);
      const distance = Math.hypot(canvasX - screen.x, canvasY - (screen.y + getTileScale() * 0.08));
      if (distance <= radius && (!closest || distance < closest.distance)) {
        const record = getPersonById(person.personId);
        if (record) closest = { person, record, distance, world };
      }
    }
    return closest;
  }

  function drawVillagers(ctx, now) {
    syncVillagers();
    const scale = getTileScale();
    const palettes = ["#8f5847", "#486f68", "#8a754c", "#685a7b"];
    const ordered = villagers.filter(person => !person.indoors).map(person => ({
      person,
      x: person.tileX + 0.5 + (person.nextX - person.tileX) * person.progress,
      y: person.tileY + 0.5 + (person.nextY - person.tileY) * person.progress
    })).sort((a, b) => a.y - b.y);

    for (const item of ordered) {
      const screen = worldToCanvas(item.x, item.y);
      if (screen.x < -12 || screen.y < -12 || screen.x > dom.gameCanvas.width + 12 || screen.y > dom.gameCanvas.height + 12) continue;
      const person = item.person;
      const record = getPersonById(person.personId);
      if (!record) continue;
      const moving = person.nextX !== person.tileX || person.nextY !== person.tileY;
      const workplace = getBuildingById(record.workBuildingId);
      const farming = !moving && person.targetPurpose === "work" && workplace?.type === "farm";
      const ageScale = person.age === "child" ? 0.72 : person.age === "elder" ? 0.88 : 1;
      const visualScale = clamp(scale / 24, 0.48, 1.65) * ageScale;
      const bob = moving ? Math.sin(now / 95 + person.phase) * 0.7 : 0;
      ctx.save();
      ctx.translate(screen.x, screen.y + scale * 0.18 + bob * visualScale);
      ctx.scale(visualScale, visualScale);
      if (hoveredVillagerId === record.id) {
        ctx.fillStyle = "rgba(190,235,150,.2)";
        ctx.strokeStyle = "rgba(205,244,167,.95)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0,-1,7.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = "rgba(4,15,10,.28)";
      ctx.beginPath(); ctx.ellipse(0,5.4,3.5,1.4,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = person.age === "elder" ? "#b8aa82" : "#3d3028";
      ctx.lineWidth = 1.3;
      const stride = moving ? Math.sin(now / 95 + person.phase) * 1.8 : 0;
      ctx.beginPath(); ctx.moveTo(-1,2.5); ctx.lineTo(-1 + stride,6); ctx.moveTo(1,2.5); ctx.lineTo(1 - stride,6); ctx.stroke();
      ctx.fillStyle = farming ? "#66854b" : palettes[person.colour];
      ctx.fillRect(-3,-4,6,8);
      if (farming) {
        const hoeSwing = Math.sin(now / 150 + person.phase) * 2.2;
        ctx.strokeStyle = "#8e6942";
        ctx.lineWidth = 1.15;
        ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(5.2 + hoeSwing, 5.3); ctx.stroke();
        ctx.strokeStyle = "#b8a777";
        ctx.lineWidth = 1.35;
        ctx.beginPath(); ctx.moveTo(3.8 + hoeSwing, 4.8); ctx.lineTo(6.5 + hoeSwing, 4.8); ctx.stroke();
      }
      if (record.ageGroup === "child" && record.schoolBuildingId) {
        ctx.fillStyle = "#c49a54"; ctx.fillRect(2,-2.5,2.4,4.6);
      }
      if (record.carriedAmount > 0) {
        ctx.fillStyle = record.carriedItem === "water" ? "#5792a3" : record.carriedItem === "timber" ? "#a5754d" : "#c49b55";
        for (let itemIndex = 0; itemIndex < record.carriedAmount; itemIndex++) {
          ctx.fillRect(3.4, 1.8 - itemIndex * 1.8, 3.3, 1.35);
        }
      }
      ctx.fillStyle = person.age === "elder" ? "#d1bfa3" : "#d7b187";
      ctx.beginPath(); ctx.arc(0,-6.2,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = person.age === "elder" ? "#d4d1c1" : "#4b352b";
      ctx.beginPath(); ctx.arc(0,-7.2,2.7,Math.PI,0); ctx.fill();
      if (person.age === "elder") {
        ctx.strokeStyle = "#8c704e"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(3,0); ctx.lineTo(4.2,6); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBuildingWorkZone(ctx, building) {
    const scale = getTileScale();
    const def = BUILDINGS[building.type];
    ctx.save();
    ctx.setLineDash([Math.max(3, scale * 0.22), Math.max(2, scale * 0.14)]);
    if (building.type === "lumber") {
      const centre = worldToCanvas(building.x + building.w / 2, building.y + building.h / 2);
      const stumps = getLoggingStumpsInRange(building).length;
      const target = getLoggingTarget(building);
      ctx.fillStyle = target ? "rgba(196,145,78,.07)" : stumps ? "rgba(209,156,81,.07)" : "rgba(220,92,77,.08)";
      ctx.strokeStyle = target ? "rgba(221,176,102,.76)" : stumps ? "rgba(224,164,87,.72)" : "rgba(238,112,96,.78)";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(centre.x, centre.y, LOGGER_RANGE * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (def.pollution) {
      const topLeft = worldToCanvas(building.x - CROP_POLLUTION_RANGE, building.y - CROP_POLLUTION_RANGE);
      ctx.fillStyle = "rgba(167,102,75,.045)";
      ctx.strokeStyle = "rgba(208,132,94,.48)";
      ctx.lineWidth = 1;
      ctx.fillRect(topLeft.x, topLeft.y, (building.w + CROP_POLLUTION_RANGE * 2) * scale, (building.h + CROP_POLLUTION_RANGE * 2) * scale);
      ctx.strokeRect(topLeft.x, topLeft.y, (building.w + CROP_POLLUTION_RANGE * 2) * scale, (building.h + CROP_POLLUTION_RANGE * 2) * scale);
    }
    if (def.noise) {
      const noiseRange = getNoisePollutionRange(building);
      const topLeft = worldToCanvas(building.x - noiseRange, building.y - noiseRange);
      ctx.setLineDash([Math.max(2, scale * 0.12), Math.max(3, scale * 0.2)]);
      ctx.fillStyle = "rgba(139,112,184,.035)";
      ctx.strokeStyle = "rgba(183,151,226,.58)";
      ctx.lineWidth = 1.2;
      ctx.fillRect(topLeft.x, topLeft.y, (building.w + noiseRange * 2) * scale, (building.h + noiseRange * 2) * scale);
      ctx.strokeRect(topLeft.x, topLeft.y, (building.w + noiseRange * 2) * scale, (building.h + noiseRange * 2) * scale);
    }
    ctx.restore();
  }

  function drawHover(ctx, x, y) {
    const scale = getTileScale();
    const hoveredBuilding = getBuildingAt(x, y);
    let originX = x;
    let originY = y;
    let width = 1;
    let height = 1;
    let invalid = false;
    if (selectedBuilding) {
      const origin = getPlacementOrigin(selectedBuilding, x, y, selectedRotation);
      const size = getBuildingSize(selectedBuilding, selectedRotation);
      const placement = getPlacementStatus(selectedBuilding, origin.x, origin.y, selectedRotation);
      originX = origin.x; originY = origin.y; width = size.w; height = size.h;
      invalid = !placement.valid || !canAfford(BUILDINGS[selectedBuilding].cost);
    } else if (hoveredBuilding) {
      originX = hoveredBuilding.x; originY = hoveredBuilding.y; width = hoveredBuilding.w; height = hoveredBuilding.h;
    } else {
      invalid = activeTool === "demolish" || !isClearing(x, y);
    }
    const zoneBuilding = selectedBuilding
      ? { type: selectedBuilding, x: originX, y: originY, w: width, h: height, id: -1 }
      : hoveredBuilding;
    if (zoneBuilding && (zoneBuilding.type === "lumber" || BUILDINGS[zoneBuilding.type]?.pollution || BUILDINGS[zoneBuilding.type]?.noise)) drawBuildingWorkZone(ctx, zoneBuilding);
    const screen = worldToCanvas(originX, originY);
    ctx.fillStyle = invalid ? "rgba(226,100,88,.2)" : "rgba(184,232,143,.17)";
    ctx.strokeStyle = invalid ? "rgba(246,126,114,.9)" : "rgba(190,235,150,.9)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(screen.x + 1, screen.y + 1, width * scale - 2, height * scale - 2);
    ctx.strokeRect(screen.x + 1, screen.y + 1, width * scale - 2, height * scale - 2);

    if (selectedBuilding) {
      ctx.save();
      ctx.globalAlpha = invalid ? 0.3 : 0.58;
      drawBuilding(ctx, { type: selectedBuilding, x: originX, y: originY, w: width, h: height, rotation: selectedRotation }, performance.now());
      ctx.restore();
    }
  }

  function drawNight(ctx) {
    const hour = ((0.25 + state.dayProgress) % 1) * 24;
    let alpha = 0;
    if (hour >= 21) alpha = Math.min(0.48, (hour - 21) / 3 * 0.48);
    else if (hour < 5) alpha = 0.48;
    else if (hour < 7) alpha = (7 - hour) / 2 * 0.48;
    if (!alpha) return;
    ctx.fillStyle = `rgba(6,17,35,${alpha})`;
    ctx.fillRect(0, 0, dom.gameCanvas.width, dom.gameCanvas.height);
  }

  function drawNightLights(ctx, bounds) {
    const hour = ((0.25 + state.dayProgress) % 1) * 24;
    if (hour >= 7 && hour < 20.5) return;
    ctx.fillStyle = "rgba(246,205,104,.83)";
    const scale = getTileScale();
    for (const building of state.buildings) {
      if (!["hearth", "cottage", "townhouse", "school", "clinic", "townhall"].includes(building.type)) continue;
      if (building.x + building.w < bounds.minX || building.x > bounds.maxX || building.y + building.h < bounds.minY || building.y > bounds.maxY) continue;
      const centre = worldToCanvas(building.x + building.w / 2, building.y + building.h / 2);
      const lightSize = clamp(scale * 0.09, 1.3, 4);
      ctx.fillRect(centre.x - lightSize * 2, centre.y, lightSize, lightSize);
      ctx.fillRect(centre.x + lightSize, centre.y, lightSize, lightSize);
    }
  }

  function initialiseWeatherParticles() {
    for (let i = 0; i < 130; i++) {
      weatherParticles.push({ x: Math.random() * 768, y: Math.random() * 768, speed: 0.5 + Math.random() * 1.5, drift: Math.random() * 0.8 - 0.4 });
    }
  }

  function positiveMod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function drawWeatherLayer(ctx, id, alpha) {
    if (alpha <= 0.002) return;
    const tints = {
      sun: "rgba(234,196,106,.045)",
      cloudy: "rgba(111,130,132,.085)",
      drizzle: "rgba(82,122,135,.035)",
      rain: "rgba(61,98,116,.075)",
      storm: "rgba(34,55,73,.17)",
      heatwave: "rgba(235,142,75,.12)",
      drought: "rgba(203,150,79,.1)",
      wind: "rgba(157,185,174,.035)",
      frost: "rgba(199,225,225,.09)",
      snow: "rgba(210,230,230,.07)",
      blizzard: "rgba(195,218,222,.16)"
    };
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (tints[id]) {
      ctx.fillStyle = tints[id];
      ctx.fillRect(0, 0, dom.gameCanvas.width, dom.gameCanvas.height);
    }
    if (id === "mist") {
      const gradient = ctx.createLinearGradient(0, 0, dom.gameCanvas.width, 0);
      const mistCentre = 0.08 + positiveMod(weatherVisualTime / 9000, 0.84);
      gradient.addColorStop(0, "rgba(210,225,212,.02)");
      gradient.addColorStop(mistCentre, "rgba(210,225,212,.16)");
      gradient.addColorStop(1, "rgba(210,225,212,.03)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dom.gameCanvas.width, dom.gameCanvas.height);
      ctx.restore();
      return;
    }
    const rainy = ["drizzle", "rain", "storm"].includes(id);
    const snowy = ["snow", "blizzard"].includes(id);
    if (!rainy && !snowy) {
      ctx.restore();
      return;
    }
    const intensity = id === "drizzle" ? 35 : id === "rain" ? 75 : id === "snow" ? 55 : 125;
    ctx.lineWidth = id === "storm" ? 1.2 : 0.75;
    for (let i = 0; i < intensity; i++) {
      const p = weatherParticles[i];
      if (snowy) {
        const y = positiveMod(p.y + weatherVisualTime * 0.025 * p.speed, 780) - 6;
        const x = positiveMod(p.x + weatherVisualTime * p.drift * 0.006 + Math.sin(y / 28 + i) * 8, 780) - 6;
        ctx.fillStyle = id === "blizzard" ? "rgba(232,242,242,.68)" : "rgba(232,242,242,.5)";
        ctx.beginPath(); ctx.arc(x, y, 0.7 + p.speed * 0.55, 0, Math.PI * 2); ctx.fill();
      } else {
        const fall = id === "storm" ? 0.48 : 0.32;
        const slant = id === "storm" ? 0.13 : 0.06;
        const y = positiveMod(p.y + weatherVisualTime * fall * p.speed, 800) - 15;
        const x = positiveMod(p.x - weatherVisualTime * slant * p.speed, 820) - 20;
        ctx.strokeStyle = id === "storm" ? "rgba(176,210,222,.48)" : "rgba(176,210,222,.3)";
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (id === "storm" ? 7 : 4), y + (id === "storm" ? 14 : 9)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawWeather(ctx) {
    const toId = WEATHERS[state.weather] ? state.weather : "mild";
    const fromId = WEATHERS[state.weatherFrom] ? state.weatherFrom : toId;
    const blend = clamp(Number(state.weatherBlend) || 0, 0, 1);
    if (blend < 0.999 && fromId !== toId) {
      drawWeatherLayer(ctx, fromId, 1 - blend);
      drawWeatherLayer(ctx, toId, blend);
    } else {
      drawWeatherLayer(ctx, toId, 1);
    }
  }

  function cacheDom() {
    const ids = [
      "villageName", "seasonIcon", "dayLabel", "clockLabel", "weatherLabel", "pauseButton", "achievementsButton", "achievementCount", "menuButton",
      "populationValue", "populationTrend", "foodValue", "foodTrend", "waterValue", "waterTrend", "woodValue", "woodTrend", "stoneValue", "stoneTrend", "coinsValue", "coinsTrend", "ecosystemValue", "ecosystemTrend",
      "buildList", "buildSearch", "collapseBuildButton", "inspectTool", "demolishTool", "treePriorityTool", "selectionSwatch", "selectionLabel", "autosaveStatus", "mapFrame", "gameCanvas", "fpsOverlay", "placementGuide", "placementGuideStep", "placementGuideTitle", "placementGuideText", "placementGuideWhy", "placementGuideSpot", "placementGuideAction", "placementGuideSkip", "descriptionToggle", "tileTooltip", "mapMessage",
      "zoomInButton", "zoomOutButton", "centerMapButton", "zoomLabel",
      "workersLabel", "familiesLabel", "footprintLabel", "footprintFill", "coordinatesLabel", "ecoBadge", "ecoRing", "ecoRingValue", "ecoSummary", "ecoMetrics",
      "learningProgress", "ecoCoachIcon", "ecoCoachMetric", "ecoCoachText", "ecoCoachPressure", "ecoCoachSupport", "ecoCoachConnection", "fieldGuideButton",
      "objectiveProgress", "objectiveIntro", "objectiveList", "eventLog", "openChronicleButton", "modalLayer", "toastStack"
    ];
    ids.forEach(id => { dom[id] = document.getElementById(id); });
  }

  function setupListeners() {
    dom.pauseButton.addEventListener("click", () => {
      if (!gameActive || state.gameOver || dom.modalLayer.children.length) return;
      state.paused = !state.paused;
      renderCalendar();
    });
    document.querySelectorAll(".speed-button").forEach(button => button.addEventListener("click", () => {
      if (!gameActive || state.gameOver || dom.modalLayer.children.length) return;
      state.speed = Number(button.dataset.speed);
      state.paused = false;
      renderCalendar();
    }));
    document.querySelectorAll(".build-tab").forEach(button => button.addEventListener("click", () => {
      document.querySelectorAll(".build-tab").forEach(tab => tab.classList.toggle("active", tab === button));
      renderBuildList();
    }));
    dom.buildSearch.addEventListener("input", renderBuildList);
    dom.buildList.addEventListener("click", event => {
      const button = event.target.closest("[data-building]");
      if (button && !button.disabled) selectBuilding(button.dataset.building);
    });
    dom.inspectTool.addEventListener("click", () => setTool("inspect"));
    dom.demolishTool.addEventListener("click", () => setTool("demolish"));
    dom.treePriorityTool.addEventListener("click", () => setTool("tree_priority"));
    dom.descriptionToggle.addEventListener("click", () => {
      state.descriptionsEnabled = state.descriptionsEnabled === false;
      dom.tileTooltip.hidden = true;
      renderDescriptionToggle();
      updateWorldDataAttributes();
      saveGame();
    });
    dom.gameCanvas.addEventListener("pointerdown", beginMapGesture);
    dom.gameCanvas.addEventListener("pointermove", handleCanvasMove);
    dom.gameCanvas.addEventListener("pointerup", endMapGesture);
    dom.gameCanvas.addEventListener("pointercancel", () => { clearTreePriorityTimer(); mapGesture = null; updateSelectionUi(); });
    dom.gameCanvas.addEventListener("pointerleave", () => {
      if (mapGesture) return;
      hoveredTile = null;
      hoveredVillagerId = null;
      dom.tileTooltip.hidden = true;
      dom.coordinatesLabel.textContent = "100 × 100 forest world";
    });
    dom.gameCanvas.addEventListener("wheel", handleMapWheel, { passive: false });
    dom.zoomInButton.addEventListener("click", () => setMapZoom(state.camera.zoom * 1.2));
    dom.zoomOutButton.addEventListener("click", () => setMapZoom(state.camera.zoom / 1.2));
    dom.centerMapButton.addEventListener("click", centreMap);
    dom.achievementsButton.addEventListener("click", () => { if (gameActive) showAchievements(); });
    dom.fieldGuideButton.addEventListener("click", () => { if (gameActive) showFieldGuide(); });
    dom.menuButton.addEventListener("click", () => openMenu());
    dom.openChronicleButton.addEventListener("click", showChronicle);
    dom.collapseBuildButton.addEventListener("click", () => {
      const panel = document.querySelector(".build-panel");
      const collapsed = panel.classList.toggle("collapsed");
      document.querySelector(".workspace").classList.toggle("build-collapsed", collapsed);
      dom.collapseBuildButton.textContent = collapsed ? "›" : "‹";
      dom.collapseBuildButton.setAttribute("aria-label", collapsed ? "Expand build panel" : "Collapse build panel");
    });

    window.addEventListener("keydown", event => {
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (typing) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (gameActive && !state.gameOver && !dom.modalLayer.children.length) {
          state.paused = !state.paused;
          renderCalendar();
        }
      }
      if (event.key === "Escape") {
        if (dom.modalLayer.children.length && modalClosable) closeModal(true);
        else if (selectedBuilding || activeTool !== "inspect") setTool("inspect");
      }
      if (gameActive && !dom.modalLayer.children.length && event.key.toLowerCase() === "o") rotateSelectedBuilding(-1);
      if (gameActive && !dom.modalLayer.children.length && event.key.toLowerCase() === "p") rotateSelectedBuilding(1);
      if (gameActive && !dom.modalLayer.children.length && ["+", "="].includes(event.key)) setMapZoom(state.camera.zoom * 1.2);
      if (gameActive && !dom.modalLayer.children.length && event.key === "-") setMapZoom(state.camera.zoom / 1.2);
      if (gameActive && !dom.modalLayer.children.length && event.key.toLowerCase() === "f") centreMap();
    });
    window.addEventListener("beforeunload", saveGame);
  }

  function gameLoop(now) {
    const deltaMs = Math.min(250, now - lastFrameTime || 0);
    lastFrameTime = now;
    const simulationRunning = gameActive && !state.paused && !state.gameOver && !dom.modalLayer.children.length;
    const lowZoom = state?.camera?.zoom < LOW_ZOOM_THRESHOLD;
    if (simulationRunning) {
      weatherVisualTime += deltaMs * state.speed;
      // At a wide view, the complete simulation was being recalculated on every
      // display frame even though its results are not visible at that precision.
      // Batch it at 20 Hz while retaining the exact elapsed game time.
      pendingSimulationMs += deltaMs;
      if (!lowZoom || pendingSimulationMs >= LOW_ZOOM_SIMULATION_INTERVAL_MS) {
        const simulationDeltaMs = pendingSimulationMs;
        pendingSimulationMs = 0;
        const deltaDays = simulationDeltaMs * state.speed / DAY_LENGTH_MS;
        updateSimulation(deltaDays);
        updateVillagers(simulationDeltaMs);
        saveElapsed += simulationDeltaMs;
        if (saveElapsed >= 5000) {
          saveElapsed = 0;
          saveGame();
        }
      }
    } else {
      pendingSimulationMs = 0;
    }
    // Preserve the existing terrain art. A wide active view presents the same
    // canvas at 30 fps; a paused map has no animated simulation to repaint.
    const mapIsBeingUsed = Boolean(mapGesture) || now < mapInteractionUntil;
    const mapFrameInterval = mapIsBeingUsed ? 0 : simulationRunning
      ? lowZoom ? LOW_ZOOM_RENDER_INTERVAL_MS : 0
      : lowZoom ? PAUSED_LOW_ZOOM_RENDER_INTERVAL_MS : PAUSED_MAP_RENDER_INTERVAL_MS;
    let mapDrawn = false;
    if (!mapFrameInterval || now - lastMapDrawTime >= mapFrameInterval) {
      lastMapDrawTime = now;
      drawMap(now, deltaMs);
      mapDrawn = true;
    }
    updateFpsOverlay(now, mapDrawn);
    // Resources and side panels do not change while paused. During play, update
    // their non-essential reports at one-third of the old frequency; actions
    // still call renderAll directly for an immediate response.
    if (simulationRunning && now - lastUiTime >= NON_ESSENTIAL_UI_REFRESH_INTERVAL_MS) {
      lastUiTime = now;
      if (state) renderAll();
    }
    window.requestAnimationFrame(gameLoop);
  }

  function installTestHooks() {
    if (!new URLSearchParams(window.location.search).has("test")) return;
    Object.defineProperty(window, "__wildrootTest", {
      value: {
        step(elapsedMs) {
          let remaining = Math.max(0, Number(elapsedMs) || 0);
          while (remaining > 0) {
            const deltaMs = Math.min(100, remaining);
            const simulationRunning = gameActive && !state.paused && !state.gameOver && !dom.modalLayer.children.length;
            if (simulationRunning) {
              weatherVisualTime += deltaMs * state.speed;
              updateSimulation(deltaMs * state.speed / DAY_LENGTH_MS);
              updateVillagers(deltaMs);
            }
            remaining -= deltaMs;
          }
          renderAll();
          drawMap(performance.now(), 0);
        },
        stepDays(days) {
          const deltaDays = Math.max(0, Number(days) || 0);
          if (gameActive && !state.paused && !state.gameOver && !dom.modalLayer.children.length) {
            updateSimulation(deltaDays);
          }
          renderAll();
          drawMap(performance.now(), 0);
        },
        populationDynamics() {
          return {
            population: state.population,
            children: state.demographics.children,
            people: state.people.length,
            progress: state.populationChangeProgress
          };
        },
        autumnProgress(day, dayProgress = 0) {
          return getAutumnColourProgress({ day, dayProgress });
        },
        staffedShift(day) {
          const target = { day: Number(day) || 1 };
          return {
            start: STAFFED_SHIFT_START_HOUR,
            end: getStaffedShiftEndHour(target),
            fraction: getStaffedShiftDayFraction(target)
          };
        },
        treeColours(seasonId, autumnProgress, colourVariation, evergreen = false) {
          return getTreeColours(seasonId, autumnProgress, colourVariation, evergreen);
        },
        deciduousCanopy(day, dayProgress = 0) {
          return getDeciduousCanopyProgress({ day, dayProgress });
        },
        isEvergreen(x, y, seed) {
          return isEvergreenTree(x, y, seed);
        },
        waterwaysFrozen(day) {
          return areWaterwaysFrozen({ day: Number(day) || 1 });
        },
        ecoRates() {
          return {
            day: getEcoRates(true),
            night: getEcoRates(false),
            daily: getDailyAverageEcoRates(),
            dayFraction: getStaffedShiftDayFraction()
          };
        },
        noiseReport(staffedProductionActive = null) {
          const mode = typeof staffedProductionActive === "boolean" ? staffedProductionActive : null;
          const report = getVillageNoiseReport(state, mode);
          return {
            sourceCount: report.sourceCount,
            activeSourceCount: report.activeSourceCount,
            homesInRange: report.homesInRange,
            exposedHomes: report.exposedHomes,
            exposedResidents: report.exposedResidents,
            averageExposure: report.averageExposure,
            moodLoss: report.moodLoss,
            healthLoss: report.healthLoss,
            range: NOISE_POLLUTION_RANGE,
            windmillRange: getNoisePollutionRange("windmill")
          };
        },
        wellbeingRates(staffedProductionActive = true) {
          const rates = getProductionRates(Boolean(staffedProductionActive), false);
          return { health: rates.health, happiness: rates.happiness };
        },
        ecoCoachAt(dayProgress) {
          const originalProgress = state.dayProgress;
          state.dayProgress = clamp(Number(dayProgress) || 0, 0, 0.999999);
          try {
            const coach = getEcoCoachInsight();
            return {
              metric: coach.metric,
              rate: coach.rate,
              trend: coach.trend,
              pressure: coach.pressure?.source || null,
              support: coach.support?.source || null,
              connection: coach.connection,
              night: isVillagerNight()
            };
          } finally {
            state.dayProgress = originalProgress;
          }
        },
        perfectBalanceEligible(difficulty = "harsh", score = 100) {
          const value = clamp(Number(score) || 0, 0, 100);
          const metrics = Object.fromEntries(Object.keys(ECO_LABELS).map(metric => [metric, value]));
          return qualifiesForPerfectBalance(difficulty, metrics);
        },
        ecosystemCollapse(metrics) {
          const values = Object.fromEntries(Object.keys(ECO_LABELS).map(metric => [metric, clamp(Number(metrics?.[metric]) || 0, 0, 100)]));
          return getEcosystemCollapse(values);
        },
        finalObjective() {
          const chapter = OBJECTIVE_CHAPTERS.at(-1);
          return { title: chapter.title, intro: chapter.intro, goals: chapter.goals.map(goal => goal.label) };
        },
        normalisedObjectiveChapter(chapter, completed = []) {
          const target = { objectiveChapter: chapter, completedObjectives: completed };
          return normaliseObjectiveProgress(target);
        },
        wildTreeTimberYield(x, y, seed = 12345) {
          return getWildTreeTimberYield(Math.floor(Number(x) || 0), Math.floor(Number(y) || 0), { terrainSeed: Number(seed) || 0 });
        },
        burnedTreeInfo(x, y) {
          const treeX = Math.floor(Number(x) || 0);
          const treeY = Math.floor(Number(y) || 0);
          const appearance = getWildTreeAppearance(treeX, treeY);
          const baseYield = getBaseWildTreeTimberYield(treeX, treeY);
          return {
            standing: isStandingTree(treeX, treeY),
            burned: appearance.burned,
            evergreen: appearance.evergreen,
            leafAmount: appearance.leafAmount,
            trunkColour: appearance.trunkColour,
            branchColour: appearance.branchColour,
            baseYield,
            timberYield: getWildTreeTimberYield(treeX, treeY),
            timberMultiplier: BURNED_TREE_TIMBER_MULTIPLIER
          };
        },
        managedTreeTimberYield(farmId, plotIndex, seed = 12345) {
          return getManagedTreeTimberYield({ id: Math.max(1, Math.floor(Number(farmId) || 1)) }, Math.max(0, Math.floor(Number(plotIndex) || 0)), { terrainSeed: Number(seed) || 0 });
        },
        farmBarnRemovalBlockers(farmId) {
          const farm = state.buildings.find(building => building.id === Number(farmId) && building.type === "farm");
          return getFarmBarnRemovalBlockers(farm).length;
        },
        loggingTargetOrder(hasPriorityTree = false, hasManagedTree = false, hasWildTree = false) {
          const chosen = selectLoggingTarget(
            hasPriorityTree ? { x: 1, y: 1, index: 101, inRange: false } : null,
            hasManagedTree ? { farm: { id: 1 }, index: 0, age: WOOD_FARM_GROWTH_DAYS } : null,
            hasWildTree ? { x: 2, y: 2, distance: 1 } : null
          );
          return chosen ? { kind: chosen.kind, priority: chosen.priority } : null;
        },
        loggingWork(buildingId, staffedProductionActive = !isVillagerNight()) {
          const building = state.buildings.find(item => item.id === Number(buildingId) && item.type === "lumber");
          if (!building) return null;
          const target = getLoggingTarget(building);
          const stump = getLoggingWorkStumps(building)[0] || (target?.kind === "wild" ? target : null);
          const stumpTreeWork = stump ? { kind: "wild", x: stump.x, y: stump.y, inRange: isTreeInLoggingRange(building, stump.x, stump.y) } : null;
          return {
            target: target ? { kind: target.kind, x: target.x, y: target.y, index: target.index, yield: getLoggingTargetTimberYield(target), inRange: target.inRange } : null,
            fellingRate: getLoggingFellingRate(building, target, state, Boolean(staffedProductionActive)),
            timberRate: getProjectedLoggingTimberRate(building, state, Boolean(staffedProductionActive)),
            stumpRate: getLoggingStumpRate(building, stump, state, Boolean(staffedProductionActive)),
            stumpFellingRate: getLoggingFellingRate(building, stumpTreeWork, state, Boolean(staffedProductionActive)),
            storageBlocked: isLoggingStorageBlocked(building)
          };
        },
        fillTimberStorage() {
          state.resources.wood = getStorageCapacity("wood");
          renderAll();
          return state.resources.wood;
        },
        staffingMultiplier(type, workers, staffedProductionActive = true) {
          const capacity = getWorkerCapacity(BUILDINGS[type]);
          const assigned = clamp(Math.floor(Number(workers) || 0), 0, capacity);
          const building = { id: -99, type };
          const people = Array.from({ length: assigned }, (_, index) => ({ id: index + 1, workBuildingId: building.id }));
          return getBuildingProductionMultiplier(building, { people }, Boolean(staffedProductionActive), 1);
        },
        travellerLifespan(id, seed = 12345) {
          return travellerLifespanForPerson({ terrainSeed: Number(seed) || 0 }, Math.max(1, Math.floor(Number(id) || 1)));
        },
        residentDeathAge(id, seed = 12345) {
          return residentDeathAgeForPerson({ terrainSeed: Number(seed) || 0 }, Math.max(1, Math.floor(Number(id) || 1)));
        },
        eventGap(roll, difficulty = "balanced", survivedDays = 1) {
          return eventGapFromRoll(roll, difficulty, survivedDays);
        },
        eventIds() {
          return EVENTS.map(event => event.id);
        },
        openEvent(id) {
          const event = EVENTS.find(item => item.id === id);
          if (!event) return false;
          showEvent(event);
          return true;
        },
        openResident(id) {
          const person = state.people.find(item => item.id === Number(id));
          if (!person) return false;
          inspectVillager(person);
          return true;
        },
        openBuilding(id) {
          const building = state.buildings.find(item => item.id === Number(id));
          if (!building) return false;
          inspectBuilding(building.x, building.y);
          return true;
        },
        openBuildingType(type) {
          const building = state.buildings.find(item => item.type === type);
          if (!building) return false;
          inspectBuilding(building.x, building.y);
          return true;
        },
        residentLife(id) {
          const person = state.people.find(item => item.id === Number(id));
          if (!person) return null;
          const currentTime = getWorldTime();
          const birthAt = Number.isFinite(Number(person.birthAt)) ? Number(person.birthAt) : currentTime;
          return {
            lived: Math.max(0, currentTime - birthAt),
            remaining: Math.max(0, Number(person.lifeEndsAt || currentTime) - currentTime),
            worldTime: currentTime
          };
        }
      },
      configurable: false,
      enumerable: false,
      writable: false
    });

    if (new URLSearchParams(window.location.search).get("test") === "winter-waterways-direct") {
      state = createNewState("Winter Waterway Test", "balanced");
      state.day = SEASON_LENGTH * 3 + 1;
      state.dayProgress = 0.5;
      state.weather = "sun";
      state.weatherFrom = "sun";
      state.weatherBlend = 1;
      state.paused = true;
      gameActive = true;
      dom.modalLayer.innerHTML = "";
      const waterwayTypes = Object.values(state.waterways || {});
      const centreRiverEntry = Object.entries(state.waterways || {}).find(([rawIndex, type]) => {
        const index = Number(rawIndex);
        return type === "river" && Math.floor(index / WORLD_SIZE) === WORLD_CENTER;
      });
      if (centreRiverEntry) {
        const index = Number(centreRiverEntry[0]);
        state.camera.x = index % WORLD_SIZE + 0.5;
        state.camera.y = Math.floor(index / WORLD_SIZE) + 0.5;
        state.camera.zoom = 1.1;
      }
      const unbridgedWaterIndex = Object.keys(state.waterways || {}).map(Number).find(index => !state.occupancy[index]);
      renderAll();
      drawMap(performance.now(), 0);
      const riverTiles = waterwayTypes.filter(type => type === "river").length;
      const creekTiles = waterwayTypes.filter(type => type === "creek").length;
      const iceStillBlocked = Number.isInteger(unbridgedWaterIndex)
        && !isVillagerWalkableForState(state, unbridgedWaterIndex % WORLD_SIZE, Math.floor(unbridgedWaterIndex / WORLD_SIZE))
        && !canOccupyOnState(state, "cottage", unbridgedWaterIndex % WORLD_SIZE, Math.floor(unbridgedWaterIndex / WORLD_SIZE));
      const checks = [
        ["Rivers and creeks freeze even during sunny winter weather", areWaterwaysFrozen(state) && getSeason(state.day).id === "winter" && state.weather === "sun"],
        ["Ice lasts from winter’s first day through its final day", areWaterwaysFrozen({ day: SEASON_LENGTH * 3 + 1 }) && areWaterwaysFrozen({ day: SEASON_LENGTH * 4 })],
        ["Waterways thaw when spring begins", !areWaterwaysFrozen({ day: SEASON_LENGTH * 4 + 1 }) && !areWaterwaysFrozen({ day: SEASON_LENGTH * 3 })],
        ["Every river and creek tile is reported frozen", Number(dom.gameCanvas.dataset.frozenRiverTiles) === riverTiles && Number(dom.gameCanvas.dataset.frozenCreekTiles) === creekTiles && dom.gameCanvas.dataset.waterwaysFrozen === "true"],
        ["Winter ice uses a static cracked surface instead of moving flow lines", dom.gameCanvas.dataset.winterIceVisual === "static-seams-and-cracks"],
        ["Natural ice remains unsafe for walking and ordinary construction", iceStillBlocked && dom.gameCanvas.dataset.winterIceMovementRule === "blocked-unless-bridge"]
      ];
      const passed = checks.every(([, pass]) => pass);
      const result = document.createElement("pre");
      result.id = "directTestResult";
      result.style.cssText = "position:fixed;z-index:99999;inset:8px auto auto 8px;max-width:850px;margin:0;padding:16px;background:#fff;color:#111;border:3px solid #111;font:16px/1.5 monospace;white-space:pre-wrap";
      result.textContent = `${passed ? "PASS" : "FAIL"}\n${checks.map(([name, pass]) => `${pass ? "✓" : "✗"} ${name}`).join("\n")}\nSunny winter · ${riverTiles} frozen river tiles · ${creekTiles} frozen creek tiles`;
      document.body.prepend(result);
      document.title = passed ? "PASS" : "FAIL";
    }

    if (new URLSearchParams(window.location.search).get("test") === "fire-logging-direct") {
      const target = createScenarioState("burned_watershed");
      const burnedIndex = Object.keys(target.burnedTrees || {})
        .map(Number)
        .find(index => Number.isInteger(index) && isStandingTree(index % WORLD_SIZE, Math.floor(index / WORLD_SIZE), target));
      const burnedX = Number.isInteger(burnedIndex) ? burnedIndex % WORLD_SIZE : -1;
      const burnedY = Number.isInteger(burnedIndex) ? Math.floor(burnedIndex / WORLD_SIZE) : -1;
      const appearance = Number.isInteger(burnedIndex) ? getWildTreeAppearance(burnedX, burnedY, target) : null;
      const baseYield = Number.isInteger(burnedIndex) ? getBaseWildTreeTimberYield(burnedX, burnedY, target) : 0;
      const burnedYield = Number.isInteger(burnedIndex) ? getWildTreeTimberYield(burnedX, burnedY, target) : 0;
      const managedFirst = selectLoggingTarget(null, { farm: { id: 1 }, index: 0, age: WOOD_FARM_GROWTH_DAYS }, { x: 2, y: 2, distance: 1 });
      const priorityFirst = selectLoggingTarget({ x: 1, y: 1, index: 101, inRange: false }, { farm: { id: 1 }, index: 0, age: WOOD_FARM_GROWTH_DAYS }, { x: 2, y: 2, distance: 1 });
      const loggingState = createNewState("Managed Grove Test", "balanced");
      loggingState.day = 10;
      const loggingCamp = addBuildingToState(loggingState, "lumber", 38, 48, 4, 2);
      const woodFarm = addBuildingToState(loggingState, "wood_farm", 44, 47, 5, 3);
      woodFarm.woodFarmPlots = Array(WOOD_FARM_PLOTS).fill(1);
      const nearbyWildTrees = getLoggingTreesInRange(loggingCamp, loggingState).length;
      const matureManagedTrees = getMatureWoodFarmSupply(loggingCamp, loggingState).length;
      const actualLoggingTarget = getLoggingTarget(loggingCamp, loggingState);

      const findPreparedBridgeSite = (testState, bridgeType) => {
        const def = BUILDINGS[bridgeType];
        for (const rotation of [0, 1]) {
          const size = getBuildingSize(bridgeType, rotation);
          const horizontal = size.w > size.h;
          const length = Math.max(size.w, size.h);
          for (let y = 0; y <= WORLD_SIZE - size.h; y++) {
            for (let x = 0; x <= WORLD_SIZE - size.w; x++) {
              const tiles = Array.from({ length }, (_, offset) => ({
                x: x + (horizontal ? offset : 0),
                y: y + (horizontal ? 0 : offset)
              }));
              const first = tiles[0];
              const last = tiles.at(-1);
              const span = tiles.slice(1, -1);
              if (getWaterwayTypeForState(testState, first.x, first.y) || getWaterwayTypeForState(testState, last.x, last.y)) continue;
              if (tiles.some(tile => testState.occupancy[tileIndex(tile.x, tile.y)])) continue;
              if (!span.every(tile => getWaterwayTypeForState(testState, tile.x, tile.y) === def.bridge)) continue;
              testState.clearedTiles[tileIndex(first.x, first.y)] = testState.day;
              testState.clearedTiles[tileIndex(last.x, last.y)] = testState.day;
              const placement = getBridgePlacementStatusForState(testState, bridgeType, x, y, rotation);
              if (placement.valid) return { x, y, rotation, tiles, first, last };
            }
          }
        }
        return null;
      };

      const riverTiles = Object.values(target.waterways || {}).filter(type => type === "river").length;
      const creekTiles = Object.values(target.waterways || {}).filter(type => type === "creek").length;
      const creekSite = findPreparedBridgeSite(target, "creek_bridge");
      const riverSite = findPreparedBridgeSite(target, "river_bridge");
      if (creekSite) addBuildingToState(target, "creek_bridge", creekSite.x, creekSite.y, target.day, target.nextBuildingId++, creekSite.rotation);
      if (riverSite) addBuildingToState(target, "river_bridge", riverSite.x, riverSite.y, target.day, target.nextBuildingId++, riverSite.rotation);
      const creekWalkable = creekSite?.tiles.every(tile => isVillagerWalkableForState(target, tile.x, tile.y)) === true;
      const riverWalkable = riverSite?.tiles.every(tile => isVillagerWalkableForState(target, tile.x, tile.y)) === true;
      const unbridgedWaterIndex = Object.keys(target.waterways || {}).map(Number).find(index => !target.occupancy[index]);
      const unbridgedWaterBlocked = Number.isInteger(unbridgedWaterIndex)
        && !isVillagerWalkableForState(target, unbridgedWaterIndex % WORLD_SIZE, Math.floor(unbridgedWaterIndex / WORLD_SIZE));
      const ordinaryBuildingBlockedByWater = Number.isInteger(unbridgedWaterIndex)
        && !canOccupyOnState(target, "cottage", unbridgedWaterIndex % WORLD_SIZE, Math.floor(unbridgedWaterIndex / WORLD_SIZE));
      const reloadedWaterState = normaliseLoadedState(JSON.parse(JSON.stringify(target)));
      const waterwaysAndBridgesPersist = Object.keys(reloadedWaterState.waterways || {}).length === Object.keys(target.waterways || {}).length
        && reloadedWaterState.buildings.filter(building => BUILDINGS[building.type]?.bridge).length === 2
        && creekSite?.tiles.every(tile => isVillagerWalkableForState(reloadedWaterState, tile.x, tile.y)) === true
        && riverSite?.tiles.every(tile => isVillagerWalkableForState(reloadedWaterState, tile.x, tile.y)) === true;

      const buildOrderSorted = BUILD_ORDER.every((type, index) => {
        if (!index) return true;
        const previous = BUILDINGS[BUILD_ORDER[index - 1]];
        const current = BUILDINGS[type];
        const previousCategory = BUILD_CATEGORY_ORDER[previous.category] ?? 99;
        const currentCategory = BUILD_CATEGORY_ORDER[current.category] ?? 99;
        return previousCategory < currentCategory
          || previousCategory === currentCategory && previous.name.localeCompare(current.name) <= 0;
      });
      const everyScenarioKeepsChannels = SCENARIOS.every(scenario => {
        const scenarioState = createScenarioState(scenario.id);
        const types = Object.values(scenarioState.waterways || {});
        return types.includes("river")
          && types.includes("creek")
          && Object.keys(scenarioState.waterways || {}).every(rawIndex => !scenarioState.occupancy[Number(rawIndex)]);
      });

      const fireScarState = createScenarioState("burned_watershed");
      let simulatedStump = null;
      for (let y = 2; y < WORLD_SIZE - 2 && !simulatedStump; y++) {
        for (let x = 2; x < WORLD_SIZE - 2; x++) {
          if (!isStandingTree(x, y, fireScarState)) continue;
          const hasTreelessNeighbour = Array.from({ length: 9 }, (_, offset) => ({ x: x + offset % 3 - 1, y: y + Math.floor(offset / 3) - 1 }))
            .some(tile => (tile.x !== x || tile.y !== y)
              && !getWaterwayTypeForState(fireScarState, tile.x, tile.y)
              && !isClearingForState(fireScarState, tile.x, tile.y)
              && !fireScarState.occupancy[tileIndex(tile.x, tile.y)]
              && !isStandingTree(tile.x, tile.y, fireScarState));
          if (hasTreelessNeighbour) {
            simulatedStump = { x, y, index: tileIndex(x, y) };
            break;
          }
        }
      }
      let openedFireScar = [];
      if (simulatedStump) {
        fireScarState.loggedTrees[simulatedStump.index] = fireScarState.day;
        delete fireScarState.loggedTrees[simulatedStump.index];
        fireScarState.clearedTiles[simulatedStump.index] = fireScarState.day;
        openedFireScar = clearAdjacentTreelessFireScar(simulatedStump.x, simulatedStump.y, fireScarState);
      }
      const fireScarClearingWorks = openedFireScar.length > 0
        && openedFireScar.every(tile => !getWaterwayTypeForState(fireScarState, tile.x, tile.y) && isClearingForState(fireScarState, tile.x, tile.y));
      const checks = [
        ["After the Fire creates damaged standing trees", Number.isInteger(burnedIndex)],
        ["Damaged trees are permanently black and leafless", appearance?.burned === true && appearance?.evergreen === false && appearance?.leafAmount === 0 && appearance?.trunkColour === "#111111"],
        ["Damaged trees yield exactly 30% less", burnedYield === Math.round(baseYield * BURNED_TREE_TIMBER_MULTIPLIER * 10) / 10],
        ["Mature managed trees outrank unmarked wild trees", managedFirst?.kind === "farm" && managedFirst?.priority === false],
        ["A real camp selects its mature Wood Farm while wild trees remain", nearbyWildTrees > 0 && matureManagedTrees === WOOD_FARM_PLOTS && actualLoggingTarget?.kind === "farm"],
        ["Manually marked wild trees remain first", priorityFirst?.kind === "wild" && priorityFirst?.priority === true],
        ["Saved world contains a three-tile river and one-tile creeks", riverTiles >= WORLD_SIZE * 3 - 12 && creekTiles >= WORLD_SIZE],
        ["Each matching bridge can span its channel", Boolean(creekSite && riverSite)],
        ["Villagers can cross every bridge deck tile", creekWalkable && riverWalkable],
        ["Unbridged water blocks villagers and ordinary buildings", unbridgedWaterBlocked && ordinaryBuildingBlockedByWater],
        ["Waterways and bridges survive a save reload", waterwaysAndBridgesPersist],
        ["Every prebuilt scenario keeps its saved channels clear", everyScenarioKeepsChannels],
        ["Plans are grouped by category, then alphabetically", buildOrderSorted],
        ["A cleared fire stump opens adjacent treeless scar, but never water", fireScarClearingWorks]
      ];
      const passed = checks.every(([, pass]) => pass);
      const result = document.createElement("pre");
      result.id = "directTestResult";
      result.style.cssText = "position:fixed;z-index:99999;inset:8px auto auto 8px;max-width:760px;margin:0;padding:16px;background:#fff;color:#111;border:3px solid #111;font:16px/1.5 monospace;white-space:pre-wrap";
      result.textContent = `${passed ? "PASS" : "FAIL"}\n${checks.map(([name, pass]) => `${pass ? "✓" : "✗"} ${name}`).join("\n")}\nBurned tree: ${baseYield} → ${burnedYield} timber · ${matureManagedTrees} managed and ${nearbyWildTrees} wild trees in camp range · ${riverTiles} river + ${creekTiles} creek tiles · ${openedFireScar.length} adjacent scar tiles opened`;
      document.body.prepend(result);
      document.title = passed ? "PASS" : "FAIL";
    }

    if (new URLSearchParams(window.location.search).get("test") === "priorities-direct") {
      const priorityState = createNewState("Priority Test", "balanced");
      priorityState.population = 10;
      priorityState.demographics = { children: 0, adults: 10, elders: 0 };
      priorityState.people = [];
      priorityState.nextPersonId = 1;
      normalisePeopleForState(priorityState);
      const lowFarm = addBuildingToState(priorityState, "farm", 39, 43, 1, priorityState.nextBuildingId++);
      const normalFarmA = addBuildingToState(priorityState, "farm", 44, 43, 1, priorityState.nextBuildingId++);
      const normalFarmB = addBuildingToState(priorityState, "farm", 54, 43, 1, priorityState.nextBuildingId++);
      const highFarm = addBuildingToState(priorityState, "farm", 40, 55, 1, priorityState.nextBuildingId++);
      lowFarm.staffingPriority = "low";
      normalFarmA.staffingPriority = "normal";
      normalFarmB.staffingPriority = "normal";
      highFarm.staffingPriority = "high";
      const lowCitizen = priorityState.people[0];
      const highCitizen = priorityState.people.at(-1);
      lowCitizen.workPriority = "low";
      highCitizen.workPriority = "high";
      assignPeopleJobs(priorityState);

      const optionalState = createNewState("Optional Priority Test", "balanced");
      optionalState.population = 3;
      optionalState.demographics = { children: 0, adults: 3, elders: 0 };
      normalisePeopleForState(optionalState);
      const requiredFarm = addBuildingToState(optionalState, "farm", 42, 45, 1, optionalState.nextBuildingId++);
      const optionalRainGarden = addBuildingToState(optionalState, "rain_garden", 55, 45, 1, optionalState.nextBuildingId++);
      requiredFarm.staffingPriority = "low";
      optionalRainGarden.staffingPriority = "high";
      assignPeopleJobs(optionalState);

      const reloaded = normaliseLoadedState(JSON.parse(JSON.stringify(priorityState)));
      assignPeopleJobs(reloaded);
      const reloadedLowFarm = reloaded.buildings.find(building => building.id === lowFarm.id);
      const reloadedHighCitizen = reloaded.people.find(person => person.id === highCitizen.id);
      const initialHighFarmWorkers = getAssignedWorkersForState(highFarm.id, priorityState);
      const initialLowFarmWorkers = getAssignedWorkersForState(lowFarm.id, priorityState);
      const initialHighCitizenWorking = Boolean(highCitizen.workBuildingId);
      const initialLowCitizenWorking = Boolean(lowCitizen.workBuildingId);

      state = priorityState;
      state.paused = false;
      gameActive = true;
      dom.modalLayer.innerHTML = "";
      renderAll();
      inspectBuilding(lowFarm.x, lowFarm.y);
      const buildingControlAppears = dom.modalLayer.querySelectorAll("[data-building-work-priority]").length === 3
        && dom.modalLayer.querySelector("[data-building-priority-row]")?.textContent.includes("Low");
      dom.modalLayer.querySelector('[data-building-work-priority="high"]')?.click();
      const buildingControlUpdates = lowFarm.staffingPriority === "high"
        && dom.modalLayer.querySelector('[data-building-work-priority="high"]')?.getAttribute("aria-pressed") === "true";
      inspectVillager(lowCitizen);
      const personControlAppears = dom.modalLayer.querySelectorAll("[data-person-work-priority]").length === 3
        && dom.modalLayer.querySelector("[data-person-priority-row]")?.textContent.includes("Low");
      dom.modalLayer.querySelector('[data-person-work-priority="high"]')?.click();
      const personControlUpdates = lowCitizen.workPriority === "high"
        && dom.modalLayer.querySelector('[data-person-work-priority="high"]')?.getAttribute("aria-pressed") === "true";

      const checks = [
        ["High-priority workplace fills before an older low-priority workplace", initialHighFarmWorkers === 3 && initialLowFarmWorkers === 0],
        ["High-priority citizen works before a low-priority citizen", initialHighCitizenWorking && !initialLowCitizenWorking],
        ["Required low-priority jobs still outrank high-priority optional helpers", getAssignedWorkersForState(requiredFarm.id, optionalState) === 2 && getAssignedWorkersForState(optionalRainGarden.id, optionalState) === 0],
        ["Workplace and citizen priorities survive save reload", reloadedLowFarm?.staffingPriority === "low" && reloadedHighCitizen?.workPriority === "high" && Boolean(reloadedHighCitizen?.workBuildingId)],
        ["Building inspection exposes three working priority controls", buildingControlAppears && buildingControlUpdates],
        ["Citizen inspection exposes three working priority controls", personControlAppears && personControlUpdates],
        ["Priority diagnostics are exposed on the game canvas", dom.gameCanvas.dataset.workplacePriorityRule?.includes("required-jobs-first") && dom.gameCanvas.dataset.citizenPriorityRule?.includes("high-normal-low")]
      ];
      const passed = checks.every(([, pass]) => pass);
      const result = document.createElement("pre");
      result.id = "directTestResult";
      result.style.cssText = "position:fixed;z-index:99999;inset:8px auto auto 8px;max-width:900px;margin:0;padding:16px;background:#fff;color:#111;border:3px solid #111;font:16px/1.5 monospace;white-space:pre-wrap";
      result.textContent = `${passed ? "PASS" : "FAIL"}\n${checks.map(([name, pass]) => `${pass ? "✓" : "✗"} ${name}`).join("\n")}\nPriority shortage before UI test: high workplace ${initialHighFarmWorkers}/3 · low workplace ${initialLowFarmWorkers}/3 · high citizen ${initialHighCitizenWorking ? "working" : "unassigned"} · low citizen ${initialLowCitizenWorking ? "working" : "unassigned"}`;
      document.body.prepend(result);
      document.title = passed ? "PASS" : "FAIL";
    }

    if (new URLSearchParams(window.location.search).get("test") === "tree-priority-toggle-direct") {
      state = createNewState("Tree Toggle Test", "balanced");
      state.paused = true;
      gameActive = true;
      dom.modalLayer.innerHTML = "";
      let tree = null;
      for (let y = 0; y < WORLD_SIZE && !tree; y++) {
        for (let x = 0; x < WORLD_SIZE; x++) {
          if (isStandingTree(x, y)) {
            tree = { x, y, index: tileIndex(x, y) };
            break;
          }
        }
      }
      const firstToggle = tree ? toggleTreePriority(tree.x, tree.y) : false;
      const markedAfterFirstHold = tree && Boolean(state.priorityTrees[tree.index]) && state.stats.treesPrioritized === 1;
      const savedMarkedTree = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      const secondToggle = tree ? toggleTreePriority(tree.x, tree.y) : false;
      const unmarkedAfterSecondHold = tree && !state.priorityTrees[tree.index] && state.stats.treesUnprioritized === 1 && isStandingTree(tree.x, tree.y);
      const savedUnmarkedTree = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      let priorityStumpUnaffected = false;
      if (tree) {
        state.loggedTrees[tree.index] = state.day;
        state.priorityStumps[tree.index] = 999;
        const stumpToggle = toggleTreePriority(tree.x, tree.y);
        priorityStumpUnaffected = stumpToggle === false && Boolean(state.priorityStumps[tree.index]);
      }
      state.priorityStumps = {};
      const manualStumpPriority = tree ? toggleStumpPriority(tree.x, tree.y) : false;
      const manuallyMarkedStump = tree && Boolean(state.priorityStumps[tree.index]);
      const manualStumpRemoval = tree ? toggleStumpPriority(tree.x, tree.y) : false;
      const manuallyUnmarkedStump = tree && !state.priorityStumps[tree.index];
      state.loggedTrees = {};
      state.priorityStumps = {};
      state.priorityTrees = {};
      const areaPriority = tree ? prioritizeTreesInArea(tree, tree) : false;
      const areaMarkedTree = tree && Boolean(state.priorityTrees[tree.index]);
      const repeatAreaPriority = tree ? prioritizeTreesInArea(tree, tree) : false;
      const areaRemovedTree = tree && !state.priorityTrees[tree.index];
      renderAll();
      const checks = [
        ["First long-hold action prioritizes a standing tree", firstToggle && markedAfterFirstHold],
        ["Marked tree is present in the saved priority map", tree && Boolean(savedMarkedTree.priorityTrees?.[tree.index])],
        ["Second long-hold action removes the priority without removing the tree", secondToggle && unmarkedAfterSecondHold],
        ["Removed priority is absent from the saved game", tree && !savedUnmarkedTree.priorityTrees?.[tree.index]],
        ["Standing-tree toggle does not erase an existing priority stump", priorityStumpUnaffected],
        ["A standing stump can be marked as priority", manualStumpPriority && manuallyMarkedStump],
        ["A manually marked stump can be unmarked", manualStumpRemoval && manuallyUnmarkedStump],
        ["Area selection prioritizes an unmarked standing tree", areaPriority && areaMarkedTree],
        ["Selecting an already-marked area removes its priorities", repeatAreaPriority && areaRemovedTree],
        ["Canvas exposes click-and-drag priority behaviour", dom.gameCanvas.dataset.treePriorityAction?.includes("priority-tool-click-and-drag") && Boolean(dom.treePriorityTool)]
      ];
      const passed = checks.every(([, pass]) => pass);
      const result = document.createElement("pre");
      result.id = "directTestResult";
      result.style.cssText = "position:fixed;z-index:99999;inset:8px auto auto 8px;max-width:900px;margin:0;padding:16px;background:#fff;color:#111;border:3px solid #111;font:16px/1.5 monospace;white-space:pre-wrap";
      result.textContent = `${passed ? "PASS" : "FAIL"}\n${checks.map(([name, pass]) => `${pass ? "✓" : "✗"} ${name}`).join("\n")}\nTree ${tree ? `${tree.x + 1}, ${tree.y + 1}` : "not found"} · ${state.stats.treesPrioritized || 0} mark · ${state.stats.treesUnprioritized || 0} removal`;
      document.body.prepend(result);
      document.title = passed ? "PASS" : "FAIL";
    }

    if (new URLSearchParams(window.location.search).get("test") === "logging-speed-direct") {
      const speedState = createNewState("Logging Speed Test", "balanced");
      speedState.weather = "mild";
      speedState.weatherFrom = "mild";
      speedState.weatherBlend = 1;
      speedState.ecosystem.forest = 90;
      speedState.education = 25;
      speedState.buffs = {};
      const camp = addBuildingToState(speedState, "lumber", 40, 48, 1, speedState.nextBuildingId++);
      assignPeopleJobs(speedState);
      for (const tree of getLoggingTreesInRange(camp, speedState)) speedState.loggedTrees[tileIndex(tree.x, tree.y)] = speedState.day;
      const automaticOutsideTree = getLoggingTarget(camp, speedState);
      const outsideTree = { kind: "wild", x: 0, y: 0, index: 0, inRange: false, priority: true };
      const insideTree = { kind: "wild", x: 40, y: 48, index: tileIndex(40, 48), inRange: true, priority: false };
      const outsideRate = getLoggingFellingRate(camp, outsideTree, speedState, true);
      const insideRate = getLoggingFellingRate(camp, insideTree, speedState, true);
      const outsideStumpRate = getLoggingStumpRate(camp, { x: 0, y: 0, index: 0 }, speedState, true);
      const insideStumpRate = getLoggingStumpRate(camp, { x: 40, y: 48, index: tileIndex(40, 48) }, speedState, true);
      const outsideHours = outsideRate > 0 ? 24 / outsideRate : Infinity;
      const insideHours = insideRate > 0 ? 24 / insideRate : Infinity;
      const fourWorkerOutsideHours = outsideRate > 0 ? 24 / (outsideRate * (4 / STANDARD_LOGGING_CREW)) : Infinity;
      const sixWorkerOutsideHours = outsideRate > 0 ? 24 / (outsideRate * (6 / STANDARD_LOGGING_CREW)) : Infinity;
      const checks = [
        ["A full two-person crew fells an outside-zone tree in five base hours", getAssignedWorkersForState(camp.id, speedState) === 2 && Math.abs(outsideHours - OUTSIDE_TREE_FELLING_HOURS) < 0.0001],
        ["Unmarked trees outside the 10× zone are selected automatically", automaticOutsideTree?.kind === "wild" && automaticOutsideTree?.remote === true && automaticOutsideTree?.inRange === false && automaticOutsideTree?.priority === false],
        ["Four shared logging workers halve an outside priority job to 2.5 hours", Math.abs(fourWorkerOutsideHours - OUTSIDE_TREE_FELLING_HOURS / 2) < 0.0001],
        ["Six shared logging workers complete it at triple speed", Math.abs(sixWorkerOutsideHours - OUTSIDE_TREE_FELLING_HOURS / 3) < 0.0001],
        ["The 10× logging zone reduces the base time to thirty minutes", Math.abs(insideHours - OUTSIDE_TREE_FELLING_HOURS / IN_RANGE_LOGGING_MULTIPLIER) < 0.0001],
        ["Outside-zone stumps use the same five-hour base rate", Math.abs(outsideStumpRate - outsideRate) < 0.0001],
        ["Inside-zone stumps use the same ten-times-faster rate", Math.abs(insideStumpRate - insideRate) < 0.0001],
        ["Canvas diagnostics expose the new timing rule", dom.gameCanvas.dataset.outsideTreeFellingBaseHours === "5" && dom.gameCanvas.dataset.insideTreeFellingBaseHours === "0.5" && dom.gameCanvas.dataset.standardLoggingCrew === "2"]
      ];
      const passed = checks.every(([, pass]) => pass);
      const result = document.createElement("pre");
      result.id = "directTestResult";
      result.style.cssText = "position:fixed;z-index:99999;inset:8px auto auto 8px;max-width:900px;margin:0;padding:16px;background:#fff;color:#111;border:3px solid #111;font:16px/1.5 monospace;white-space:pre-wrap";
      result.textContent = `${passed ? "PASS" : "FAIL"}\n${checks.map(([name, pass]) => `${pass ? "✓" : "✗"} ${name}`).join("\n")}\nOutside ${outsideHours.toFixed(2)}h · 4 workers ${fourWorkerOutsideHours.toFixed(2)}h · 6 workers ${sixWorkerOutsideHours.toFixed(2)}h · inside ${insideHours.toFixed(2)}h`;
      document.body.prepend(result);
      document.title = passed ? "PASS" : "FAIL";
    }
  }

  function init() {
    cacheDom();
    Object.defineProperty(window, "FPS", {
      configurable: true,
      get: toggleFpsOverlay
    });
    loadAchievements();
    state = createNewState("Mossbank Clearing", "balanced");
    setupListeners();
    initialiseWeatherParticles();
    renderAll();
    showStartScreen();
    installTestHooks();
    window.requestAnimationFrame(gameLoop);
  }

  init();
})();
