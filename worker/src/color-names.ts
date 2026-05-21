// Comprehensive color name to hex mapping
export const COLOR_NAME_TO_HEX: Record<string, string> = {
  // CSS Named Colors
  "alice blue": "#F0F8FF", "antiquewhite": "#FAEBD7", "aqua": "#00FFFF",
  "aquamarine": "#7FFFD4", "azure": "#F0FFFF", "beige": "#F5F5DC",
  "bisque": "#FFE4C4", "black": "#000000", "blanchedalmond": "#FFEBCD",
  "blue": "#0000FF", "blueviolet": "#8A2BE2", "brown": "#A52A2A",
  "burlywood": "#DEB887", "cadetblue": "#5F9EA0", "chartreuse": "#7FFF00",
  "chocolate": "#D2691E", "coral": "#FF7F50", "cornflowerblue": "#6495ED",
  "cornsilk": "#FFF8DC", "crimson": "#DC143C", "cyan": "#00FFFF",
  "darkblue": "#00008B", "darkcyan": "#008B8B", "darkgoldenrod": "#B8860B",
  "darkgray": "#A9A9A9", "darkgreen": "#006400", "darkgrey": "#A9A9A9",
  "darkkhaki": "#BDB76B", "darkmagenta": "#8B008B", "darkolivegreen": "#556B2F",
  "darkorange": "#FF8C00", "darkorchid": "#9932CC", "darkred": "#8B0000",
  "darksalmon": "#E9967A", "darkseagreen": "#8FBC8F", "darkslateblue": "#483D8B",
  "darkslategray": "#2F4F4F", "darkslategrey": "#2F4F4F", "darkturquoise": "#00CED1",
  "darkviolet": "#9400D3", "deeppink": "#FF1493", "deepskyblue": "#00BFFF",
  "dimgray": "#696969", "dimgrey": "#696969", "dodgerblue": "#1E90FF",
  "firebrick": "#B22222", "floralwhite": "#FFFAF0", "forestgreen": "#228B22",
  "fuchsia": "#FF00FF", "gainsboro": "#DCDCDC", "ghostwhite": "#F8F8FF",
  "gold": "#FFD700", "goldenrod": "#DAA520", "gray": "#808080",
  "green": "#008000", "greenyellow": "#ADFF2F", "grey": "#808080",
  "honeydew": "#F0FFF0", "hotpink": "#FF69B4", "indianred": "#CD5C5C",
  "indigo": "#4B0082", "ivory": "#FFFFF0", "khaki": "#F0E68C",
  "lavender": "#E6E6FA", "lavenderblush": "#FFF0F5", "lawngreen": "#7CFC00",
  "lemonchiffon": "#FFFACD", "lightblue": "#ADD8E6", "lightcoral": "#F08080",
  "lightcyan": "#E0FFFF", "lightgoldenrodyellow": "#FAFAD2", "lightgray": "#D3D3D3",
  "lightgreen": "#90EE90", "lightgrey": "#D3D3D3", "lightpink": "#FFB6C1",
  "lightsalmon": "#FFA07A", "lightseagreen": "#20B2AA", "lightskyblue": "#87CEFA",
  "lightslategray": "#778899", "lightslategrey": "#778899", "lightsteelblue": "#B0C4DE",
  "lightyellow": "#FFFFE0", "lime": "#00FF00", "limegreen": "#32CD32",
  "linen": "#FAF0E6", "magenta": "#FF00FF", "maroon": "#800000",
  "mediumaquamarine": "#66CDAA", "mediumblue": "#0000CD", "mediumorchid": "#BA55D3",
  "mediumpurple": "#9370DB", "mediumseagreen": "#3CB371", "mediumslateblue": "#7B68EE",
  "mediumspringgreen": "#00FA9A", "mediumturquoise": "#48D1CC", "mediumvioletred": "#C71585",
  "midnightblue": "#191970", "mintcream": "#F5FFFA", "mistyrose": "#FFE4E1",
  "moccasin": "#FFE4B5", "navajowhite": "#FFDEAD", "navy": "#000080",
  "oldlace": "#FDF5E6", "olive": "#808000", "olivedrab": "#6B8E23",
  "orange": "#FFA500", "orangered": "#FF4500", "orchid": "#DA70D6",
  "palegoldenrod": "#EEE8AA", "palegreen": "#98FB98", "paleturquoise": "#AFEEEE",
  "palevioletred": "#DB7093", "papayawhip": "#FFEFD5", "peachpuff": "#FFDAB9",
  "peru": "#CD853F", "pink": "#FFC0CB", "plum": "#DDA0DD",
  "powderblue": "#B0E0E6", "purple": "#800080", "rebeccapurple": "#663399",
  "red": "#FF0000", "rosybrown": "#BC8F8F", "royalblue": "#4169E1",
  "saddlebrown": "#8B4513", "salmon": "#FA8072", "sandybrown": "#F4A460",
  "seagreen": "#2E8B57", "seashell": "#FFF5EE", "sienna": "#A0522D",
  "silver": "#C0C0C0", "skyblue": "#87CEEB", "slateblue": "#6A5ACD",
  "slategray": "#708090", "slategrey": "#708090", "snow": "#FFFAFA",
  "springgreen": "#00FF7F", "steelblue": "#4682B4", "tan": "#D2B48C",
  "teal": "#008080", "thistle": "#D8BFD8", "tomato": "#FF6347",
  "turquoise": "#40E0D0", "violet": "#EE82EE", "wheat": "#F5DEB3",
  "white": "#FFFFFF", "whitesmoke": "#F5F5F5", "yellow": "#FFFF00",
  "yellowgreen": "#9ACD32",
  // Extended Colordle colors
  "night sky": "#0C1445", "smoke": "#738276", "sage": "#BCB88A",
  "navy blue": "#000080", "periwinkle": "#CCCCFF", "red brown": "#A52A2A",
  "plum": "#8E4585", "brown red": "#9B2335", "dark orange": "#FF8C00",
  "slate": "#708090", "cheese": "#FFC600", "hot": "#FF4B00",
  "tea": "#B5AD7F", "deep blue": "#003399", "sand": "#C2B280",
  "blood": "#8A0303", "cream": "#FFFDD0", "jade": "#00A86B",
  "mahogany": "#C04000", "snow": "#FFFAFA", "golden": "#FFD700",
  "sapphire": "#0F52BA", "graphite": "#383838", "taupe": "#483C32",
  "neon red": "#FF073A", "bright yellow": "#FFD700", "neon yellow": "#CCFF00",
  "red orange": "#FF4500", "metal": "#7A7D7E", "blue green": "#0D98BA",
  "dark": "#1A1A1A", "light teal": "#7DF9FF", "blueberry": "#4F86F7",
  "light yellow": "#FFFFE0", "stone": "#928E85", "light red": "#FF6347",
  "sea": "#2E8B57", "midnight": "#191970", "pastel blue": "#AEC6CF",
  "canary": "#FFEF00", "mango": "#FF8243", "iron": "#48494B",
  "turquoise": "#40E0D0", "midnight blue": "#191970", "chestnut": "#954535",
  "pastel yellow": "#FDFD96", "lead": "#4E4E4E", "brick": "#CB4154",
  "grape": "#6F2DA8", "blue grey": "#6699CC", "watermelon": "#FC6C85",
  "crimson": "#DC143C", "green blue": "#0099CC", "cinnamon": "#D2691E",
  "blood red": "#660000", "steel": "#71797E", "dark green": "#006400",
  "cornflower": "#6495ED", "clay": "#B66A50", "mint": "#3EB489",
  "copper": "#B87333", "light green": "#90EE90", "eggplant": "#614051",
  "sea green": "#2E8B57", "ginger": "#B06500", "ice": "#D6FFFA",
  "pastel green": "#77DD77", "ocean": "#006994", "ash": "#B2BEB5",
  "pear": "#D1E231", "cherry": "#DE3163", "vanilla": "#F3E5AB",
  "hot pink": "#FF69B4", "mustard": "#FFDB58", "mocha": "#7A5230",
  "sangria": "#92000A", "cloud": "#C7C9D5", "cloudy": "#C7C9D5",
  "grass": "#7CFC00", "cobalt": "#0047AB", "tangerine": "#FF9966",
  "avocado": "#568203", "oxford blue": "#002147", "spa": "#A6D7D5",
  "sage green": "#8A9A5B", "coco": "#8B4513", "pumpkin": "#FF7518",
  "orangered": "#FF4500", "bloodred": "#660000", "darkorange": "#FF8C00",
  "pastelblue": "#AEC6CF", "lightpink": "#FFB6C1", "bluepurple": "#8A2BE2",
  "greenyellow": "#ADFF2F", "darkblue": "#00008B",
  "champagne": "#F7E7CE", "emerald": "#50C878", "peach": "#FFCBA4",
  "rust": "#B7410E", "scarlet": "#FF2400", "burgundy": "#800020",
  "cerulean": "#007BA7", "hunter green": "#355E3B", "lilac": "#C8A2C8",
  "marigold": "#EAA221", "rose": "#FF007F", "sky blue": "#87CEEB",
  "terra cotta": "#E2725B", "umber": "#635147", "vermilion": "#E34234",
  "viridian": "#40826D", "amber": "#FFBF00", "apricot": "#FBCEB1",
  "asparagus": "#87A96B", "cerise": "#DE3163", "denim": "#1560BD",
  "ecru": "#C2B280", "heliotrope": "#DF73FF", "jungle green": "#29AB87",
  "lavender blue": "#CCCCFF", "lemon": "#FFF44F", "melon": "#FDBCB4",
  "mulberry": "#C54B8C", "opal": "#A8C3BC", "pine": "#01796F",
  "raspberry": "#E30B5C", "wine": "#722F37", "amethyst": "#9966CC",
  "bronze": "#CD7F32", "caramel": "#FFD59A", "clover": "#2E8B57",
  "dandelion": "#F0E130", "flamingo": "#FC8EAC", "iris": "#5A5FCF",
  "jade green": "#00A86B", "kelly green": "#4CBB17", "neon green": "#39FF14",
  "ocean blue": "#006994", "pewter": "#96A8A1", "sunflower": "#FFDA03",
  "tulip": "#FF878D", "violet blue": "#324AB2", "willow": "#B9B57A",
  "zucchini": "#00563F", "barn red": "#7C0A02", "biscuit": "#C4A882",
  "blossom": "#F9B7FF", "bone": "#E3DAC9", "cactus": "#5A7D3A",
  "dusk": "#4E5481", "elf green": "#088346", "fern": "#4F7942",
  "glacier": "#71A6D2", "horizon": "#5B87A6", "ink": "#0E0E2C",
  "juniper": "#6B8E7B", "lagoon": "#2AE5C8", "marsh": "#7A8B60",
  "nebula": "#6B3FA0", "obsidian": "#0A0A0A", "petal": "#F4C2C2",
  "quicksilver": "#A6A6A6", "reef": "#C9B18C", "shadow": "#7A7A7A",
  "thunder": "#4E4E4E", "urban": "#535E5B", "vapor": "#F0F0F0",
  "wisteria": "#C9A0DC", "zephyr": "#A5D8E6",
};

export function getColorHex(name: string): string {
  const lower = name.toLowerCase().replace(/\s+/g, ' ').trim();
  if (COLOR_NAME_TO_HEX[lower]) return COLOR_NAME_TO_HEX[lower];
  const noSpace = lower.replace(/\s+/g, '');
  if (COLOR_NAME_TO_HEX[noSpace]) return COLOR_NAME_TO_HEX[noSpace];
  for (const [key, val] of Object.entries(COLOR_NAME_TO_HEX)) {
    if (key.replace(/\s+/g, '') === noSpace) return val;
  }
  // Fallback: generate from name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return hslToHex(h, 60, 50);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
