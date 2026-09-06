package com.inventra.inventra_backend.common.geo.application;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GeoService {

    private static final Map<String, List<String>> STATE_CITIES_MAP;

    static {
        Map<String, List<String>> map = new LinkedHashMap<>();

        map.put("Andhra Pradesh", List.of(
            "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Kakinada",
            "Rajahmundry", "Kadapa", "Tirupati", "Anantapur", "Vizianagaram", "Eluru",
            "Ongole", "Nandyal", "Machilipatnam", "Chittoor", "Srikakulam"
        ));

        map.put("Arunachal Pradesh", List.of(
            "Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Bomdila"
        ));

        map.put("Assam", List.of(
            "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon"
        ));

        map.put("Bihar", List.of(
            "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga",
            "Bihar Sharif", "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra", "Sasaram"
        ));

        map.put("Chhattisgarh", List.of(
            "Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Durg", "Jagdalpur", "Ambikapur"
        ));

        map.put("Goa", List.of(
            "Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim"
        ));

        map.put("Gujarat", List.of(
            "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar",
            "Junagadh", "Gandhinagar", "Anand", "Navsari", "Morbi", "Nadiad",
            "Surendranagar", "Bharuch", "Mehsana", "Bhuj", "Porbandar", "Vapi", "Valsad"
        ));

        map.put("Haryana", List.of(
            "Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak",
            "Hisar", "Karnal", "Sonipat", "Panchkula", "Bhiwani", "Sirsa", "Bahadurgarh", "Rewari"
        ));

        map.put("Himachal Pradesh", List.of(
            "Shimla", "Dharamshala", "Solan", "Mandi", "Kullu", "Baddi", "Nahan", "Hamirpur", "Una", "Bilaspur", "Manali"
        ));

        map.put("Jharkhand", List.of(
            "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh"
        ));

        map.put("Karnataka", List.of(
            "Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", "Davanagere",
            "Ballari", "Kalaburagi", "Vijayapura", "Shivamogga", "Tumakuru", "Raichur",
            "Bidar", "Hosapete", "Gadag", "Udupi", "Hassan", "Bhadravati", "Mandya", "Chikkamagaluru", "Kolar"
        ));

        map.put("Kerala", List.of(
            "Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Kannur",
            "Alappuzha", "Kottayam", "Palakkad", "Malappuram", "Kasaragod", "Pathanamthitta"
        ));

        map.put("Madhya Pradesh", List.of(
            "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas",
            "Satna", "Ratlam", "Rewa", "Katni", "Singrauli", "Burhanpur", "Khandwa", "Chhindwara"
        ));

        map.put("Maharashtra", List.of(
            "Mumbai", "Pune", "Nagpur", "Thane", "Pimpri-Chinchwad", "Nashik",
            "Kalyan-Dombivli", "Vasai-Virar", "Chhatrapati Sambhajinagar", "Navi Mumbai",
            "Solapur", "Mira-Bhayandar", "Amravati", "Kolhapur", "Akola", "Ulhasnagar",
            "Sangli", "Malegaon", "Jalgaon", "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Panvel", "Satara"
        ));

        map.put("Manipur", List.of(
            "Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Ukhrul"
        ));

        map.put("Meghalaya", List.of(
            "Shillong", "Tura", "Jowai", "Nongpoh", "Baghmara"
        ));

        map.put("Mizoram", List.of(
            "Aizawl", "Lunglei", "Saiha", "Champhai", "Serchhip"
        ));

        map.put("Nagaland", List.of(
            "Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"
        ));

        map.put("Odisha", List.of(
            "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri",
            "Balasore", "Bhadrak", "Baripada", "Jharsuguda", "Jeypore"
        ));

        map.put("Punjab", List.of(
            "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali",
            "Hoshiarpur", "Batala", "Pathankot", "Moga", "Abohar", "Phagwara", "Khanna"
        ));

        map.put("Rajasthan", List.of(
            "Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara",
            "Alwar", "Bharatpur", "Sikar", "Pali", "Sri Ganganagar", "Beawar", "Chittorgarh"
        ));

        map.put("Sikkim", List.of(
            "Gangtok", "Namchi", "Geyzing", "Mangan"
        ));

        map.put("Tamil Nadu", List.of(
            "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur",
            "Erode", "Tirunelveli", "Vellore", "Thoothukudi", "Dindigul", "Thanjavur",
            "Hosur", "Nagercoil", "Kanchipuram", "Kumbakonam", "Cuddalore", "Pudukkottai"
        ));

        map.put("Telangana", List.of(
            "Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam",
            "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet", "Siddipet"
        ));

        map.put("Tripura", List.of(
            "Agartala", "Dharmanagar", "Udaipur", "Kailashahar", "Belonia"
        ));

        map.put("Uttar Pradesh", List.of(
            "Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj",
            "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida",
            "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Ayodhya", "Rampur", "Shahjahanpur"
        ));

        map.put("Uttarakhand", List.of(
            "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Nainital"
        ));

        map.put("West Bengal", List.of(
            "Kolkata", "Howrah", "Asansol", "Siliguri", "Durgapur", "Bardhaman",
            "Malda", "Baharampur", "Kharagpur", "Haldia", "Jalpaiguri", "Darjeeling"
        ));

        // Union Territories
        map.put("Andaman and Nicobar Islands", List.of("Port Blair"));
        map.put("Chandigarh", List.of("Chandigarh"));
        map.put("Dadra and Nagar Haveli and Daman and Diu", List.of("Daman", "Diu", "Silvassa"));
        map.put("Delhi", List.of(
            "New Delhi", "Central Delhi", "North Delhi", "South Delhi", "East Delhi",
            "West Delhi", "North East Delhi", "North West Delhi", "South East Delhi", "South West Delhi", "Shahdara"
        ));
        map.put("Jammu and Kashmir", List.of("Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Udhampur", "Sopore"));
        map.put("Ladakh", List.of("Leh", "Kargil"));
        map.put("Lakshadweep", List.of("Kavaratti", "Agatti", "Amini", "Andrott"));
        map.put("Puducherry", List.of("Puducherry", "Karaikal", "Mahe", "Yanam"));

        STATE_CITIES_MAP = Collections.unmodifiableMap(map);
    }

    public List<String> getStates() {
        return List.copyOf(STATE_CITIES_MAP.keySet());
    }

    public List<String> getCities(String state) {
        if (state == null || state.isBlank()) {
            return List.of();
        }

        // Exact match
        List<String> cities = STATE_CITIES_MAP.get(state);
        if (cities != null) {
            return cities;
        }

        // Case-insensitive match
        for (Map.Entry<String, List<String>> entry : STATE_CITIES_MAP.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(state.trim())) {
                return entry.getValue();
            }
        }

        return List.of();
    }
}
