export interface IndianStateOption {
  name: string;
  type: "STATE" | "UT";
}

export const INDIAN_STATES: IndianStateOption[] = [
  // 28 States
  { name: "Andhra Pradesh", type: "STATE" },
  { name: "Arunachal Pradesh", type: "STATE" },
  { name: "Assam", type: "STATE" },
  { name: "Bihar", type: "STATE" },
  { name: "Chhattisgarh", type: "STATE" },
  { name: "Goa", type: "STATE" },
  { name: "Gujarat", type: "STATE" },
  { name: "Haryana", type: "STATE" },
  { name: "Himachal Pradesh", type: "STATE" },
  { name: "Jharkhand", type: "STATE" },
  { name: "Karnataka", type: "STATE" },
  { name: "Kerala", type: "STATE" },
  { name: "Madhya Pradesh", type: "STATE" },
  { name: "Maharashtra", type: "STATE" },
  { name: "Manipur", type: "STATE" },
  { name: "Meghalaya", type: "STATE" },
  { name: "Mizoram", type: "STATE" },
  { name: "Nagaland", type: "STATE" },
  { name: "Odisha", type: "STATE" },
  { name: "Punjab", type: "STATE" },
  { name: "Rajasthan", type: "STATE" },
  { name: "Sikkim", type: "STATE" },
  { name: "Tamil Nadu", type: "STATE" },
  { name: "Telangana", type: "STATE" },
  { name: "Tripura", type: "STATE" },
  { name: "Uttar Pradesh", type: "STATE" },
  { name: "Uttarakhand", type: "STATE" },
  { name: "West Bengal", type: "STATE" },

  // 8 Union Territories
  { name: "Andaman and Nicobar Islands", type: "UT" },
  { name: "Chandigarh", type: "UT" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", type: "UT" },
  { name: "Delhi", type: "UT" },
  { name: "Jammu and Kashmir", type: "UT" },
  { name: "Ladakh", type: "UT" },
  { name: "Lakshadweep", type: "UT" },
  { name: "Puducherry", type: "UT" },
];

export const INDIAN_STATE_CITIES: Record<string, string[]> = {
  "Andhra Pradesh": [
    "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Kakinada",
    "Rajahmundry", "Kadapa", "Tirupati", "Anantapur", "Vizianagaram", "Eluru",
    "Ongole", "Nandyal", "Machilipatnam", "Chittoor", "Srikakulam"
  ],
  "Arunachal Pradesh": [
    "Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Bomdila"
  ],
  "Assam": [
    "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon"
  ],
  "Bihar": [
    "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga",
    "Bihar Sharif", "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra", "Sasaram"
  ],
  "Chhattisgarh": [
    "Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Durg", "Jagdalpur", "Ambikapur"
  ],
  "Goa": [
    "Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim"
  ],
  "Gujarat": [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar",
    "Junagadh", "Gandhinagar", "Anand", "Navsari", "Morbi", "Nadiad",
    "Surendranagar", "Bharuch", "Mehsana", "Bhuj", "Porbandar", "Vapi", "Valsad"
  ],
  "Haryana": [
    "Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak",
    "Hisar", "Karnal", "Sonipat", "Panchkula", "Bhiwani", "Sirsa", "Bahadurgarh", "Rewari"
  ],
  "Himachal Pradesh": [
    "Shimla", "Dharamshala", "Solan", "Mandi", "Kullu", "Baddi", "Nahan", "Hamirpur", "Una", "Bilaspur", "Manali"
  ],
  "Jharkhand": [
    "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh"
  ],
  "Karnataka": [
    "Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", "Davanagere",
    "Ballari", "Kalaburagi", "Vijayapura", "Shivamogga", "Tumakuru", "Raichur",
    "Bidar", "Hosapete", "Gadag", "Udupi", "Hassan", "Bhadravati", "Mandya", "Chikkamagaluru", "Kolar"
  ],
  "Kerala": [
    "Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Kannur",
    "Alappuzha", "Kottayam", "Palakkad", "Malappuram", "Kasaragod", "Pathanamthitta"
  ],
  "Madhya Pradesh": [
    "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas",
    "Satna", "Ratlam", "Rewa", "Katni", "Singrauli", "Burhanpur", "Khandwa", "Chhindwara"
  ],
  "Maharashtra": [
    "Mumbai", "Pune", "Nagpur", "Thane", "Pimpri-Chinchwad", "Nashik",
    "Kalyan-Dombivli", "Vasai-Virar", "Chhatrapati Sambhajinagar", "Navi Mumbai",
    "Solapur", "Mira-Bhayandar", "Amravati", "Kolhapur", "Akola", "Ulhasnagar",
    "Sangli", "Malegaon", "Jalgaon", "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Panvel", "Satara"
  ],
  "Manipur": [
    "Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Ukhrul"
  ],
  "Meghalaya": [
    "Shillong", "Tura", "Jowai", "Nongpoh", "Baghmara"
  ],
  "Mizoram": [
    "Aizawl", "Lunglei", "Saiha", "Champhai", "Serchhip"
  ],
  "Nagaland": [
    "Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"
  ],
  "Odisha": [
    "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri",
    "Balasore", "Bhadrak", "Baripada", "Jharsuguda", "Jeypore"
  ],
  "Punjab": [
    "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali",
    "Hoshiarpur", "Batala", "Pathankot", "Moga", "Abohar", "Phagwara", "Khanna"
  ],
  "Rajasthan": [
    "Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara",
    "Alwar", "Bharatpur", "Sikar", "Pali", "Sri Ganganagar", "Beawar", "Chittorgarh"
  ],
  "Sikkim": [
    "Gangtok", "Namchi", "Geyzing", "Mangan"
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur",
    "Erode", "Tirunelveli", "Vellore", "Thoothukudi", "Dindigul", "Thanjavur",
    "Hosur", "Nagercoil", "Kanchipuram", "Kumbakonam", "Cuddalore", "Pudukkottai"
  ],
  "Telangana": [
    "Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam",
    "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet", "Siddipet"
  ],
  "Tripura": [
    "Agartala", "Dharmanagar", "Udaipur", "Kailashahar", "Belonia"
  ],
  "Uttar Pradesh": [
    "Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj",
    "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida",
    "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Ayodhya", "Rampur", "Shahjahanpur"
  ],
  "Uttarakhand": [
    "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Nainital"
  ],
  "West Bengal": [
    "Kolkata", "Howrah", "Asansol", "Siliguri", "Durgapur", "Bardhaman",
    "Malda", "Baharampur", "Kharagpur", "Haldia", "Jalpaiguri", "Darjeeling"
  ],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Delhi": [
    "New Delhi", "Central Delhi", "North Delhi", "South Delhi", "East Delhi",
    "West Delhi", "North East Delhi", "North West Delhi", "South East Delhi", "South West Delhi", "Shahdara"
  ],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Udhampur", "Sopore"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti", "Agatti", "Amini", "Andrott"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"]
};

export function getCitiesForState(stateName: string): string[] {
  if (!stateName) return [];
  // Exact match
  if (INDIAN_STATE_CITIES[stateName]) {
    return INDIAN_STATE_CITIES[stateName];
  }
  // Case-insensitive match
  const foundKey = Object.keys(INDIAN_STATE_CITIES).find(
    (k) => k.toLowerCase() === stateName.trim().toLowerCase()
  );
  return foundKey ? INDIAN_STATE_CITIES[foundKey] : [];
}
