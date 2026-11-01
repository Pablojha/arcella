import College from '../models/College.js';
import { slugify } from '../utils/text.js';

/** [name, short name, city, state, official email domains] — admins can edit everything later. */
const COLLEGES = [
  ['School of Planning and Architecture, New Delhi', 'SPA Delhi', 'New Delhi', 'Delhi', ['spa.ac.in']],
  ['School of Planning and Architecture, Bhopal', 'SPA Bhopal', 'Bhopal', 'Madhya Pradesh', ['spabhopal.ac.in']],
  ['School of Planning and Architecture, Vijayawada', 'SPA Vijayawada', 'Vijayawada', 'Andhra Pradesh', ['spav.ac.in']],
  ['CEPT University', 'CEPT', 'Ahmedabad', 'Gujarat', ['cept.ac.in']],
  ['Sir J.J. College of Architecture', 'Sir JJ', 'Mumbai', 'Maharashtra', []],
  ['Indian Institute of Technology Roorkee', 'IIT Roorkee', 'Roorkee', 'Uttarakhand', ['iitr.ac.in']],
  ['Indian Institute of Technology Kharagpur', 'IIT Kharagpur', 'Kharagpur', 'West Bengal', ['iitkgp.ac.in']],
  ['Indian Institute of Technology (BHU) Varanasi', 'IIT BHU', 'Varanasi', 'Uttar Pradesh', ['iitbhu.ac.in', 'itbhu.ac.in']],
  ['National Institute of Technology Tiruchirappalli', 'NIT Trichy', 'Tiruchirappalli', 'Tamil Nadu', ['nitt.edu']],
  ['National Institute of Technology Calicut', 'NIT Calicut', 'Kozhikode', 'Kerala', ['nitc.ac.in']],
  ['National Institute of Technology Rourkela', 'NIT Rourkela', 'Rourkela', 'Odisha', ['nitrkl.ac.in']],
  ['National Institute of Technology Patna', 'NIT Patna', 'Patna', 'Bihar', ['nitp.ac.in']],
  ['National Institute of Technology Raipur', 'NIT Raipur', 'Raipur', 'Chhattisgarh', ['nitrr.ac.in']],
  ['National Institute of Technology Hamirpur', 'NIT Hamirpur', 'Hamirpur', 'Himachal Pradesh', ['nith.ac.in']],
  ['Malaviya National Institute of Technology Jaipur', 'MNIT Jaipur', 'Jaipur', 'Rajasthan', ['mnit.ac.in']],
  ['Maulana Azad National Institute of Technology Bhopal', 'MANIT Bhopal', 'Bhopal', 'Madhya Pradesh', ['manit.ac.in']],
  ['Visvesvaraya National Institute of Technology Nagpur', 'VNIT Nagpur', 'Nagpur', 'Maharashtra', ['vnit.ac.in']],
  ['Indian Institute of Engineering Science and Technology, Shibpur', 'IIEST Shibpur', 'Howrah', 'West Bengal', ['iiests.ac.in']],
  ['Faculty of Architecture and Ekistics, Jamia Millia Islamia', 'Jamia', 'New Delhi', 'Delhi', ['jmi.ac.in']],
  ['School of Architecture and Planning, Anna University', 'SAP Anna University', 'Chennai', 'Tamil Nadu', ['annauniv.edu']],
  ['Department of Architecture, Birla Institute of Technology Mesra', 'BIT Mesra', 'Ranchi', 'Jharkhand', ['bitmesra.ac.in']],
  ['Department of Architecture, College of Engineering Trivandrum', 'CET', 'Thiruvananthapuram', 'Kerala', ['cet.ac.in']],
  ['Manipal School of Architecture and Planning', 'MSAP', 'Manipal', 'Karnataka', ['manipal.edu']],
  ['Department of Architecture, Aligarh Muslim University', 'AMU', 'Aligarh', 'Uttar Pradesh', []],
  ['Department of Architecture, Jadavpur University', 'Jadavpur', 'Kolkata', 'West Bengal', []],
  ['Chandigarh College of Architecture', 'CCA', 'Chandigarh', 'Chandigarh', []],
  ['Kamla Raheja Vidyanidhi Institute for Architecture', 'KRVIA', 'Mumbai', 'Maharashtra', []],
  ['Rachana Sansad Academy of Architecture', 'Rachana Sansad', 'Mumbai', 'Maharashtra', []],
  ['Rizvi College of Architecture', 'Rizvi', 'Mumbai', 'Maharashtra', []],
  ['Bharati Vidyapeeth College of Architecture', 'BVCOA', 'Pune', 'Maharashtra', []],
  ["Marathwada Mitra Mandal's College of Architecture", 'MMCOA', 'Pune', 'Maharashtra', []],
  ['Dr. D.Y. Patil College of Architecture', 'DYPCOA', 'Pune', 'Maharashtra', []],
  ['RV College of Architecture', 'RVCA', 'Bengaluru', 'Karnataka', []],
  ['BMS College of Architecture', 'BMSCA', 'Bengaluru', 'Karnataka', []],
  ['Sushant School of Art and Architecture', 'SSAA', 'Gurugram', 'Haryana', []],
  ['TVB School of Habitat Studies', 'TVB', 'New Delhi', 'Delhi', []],
  ['Vastu Kala Academy', 'VKA', 'New Delhi', 'Delhi', []],
  ['Amity School of Architecture and Planning', 'ASAP Amity', 'Noida', 'Uttar Pradesh', []],
  ['Faculty of Architecture, Dr. A.P.J. Abdul Kalam Technical University', 'FoA AKTU', 'Lucknow', 'Uttar Pradesh', []],
  ['School of Planning and Architecture, JNAFAU', 'SPA JNAFAU', 'Hyderabad', 'Telangana', []],
  ['Goa College of Architecture', 'GCA', 'Panaji', 'Goa', []],
  ['Department of Architecture, M.S. University of Baroda', 'MSU Baroda', 'Vadodara', 'Gujarat', []],
  ['CARE School of Architecture', 'CARE', 'Tiruchirappalli', 'Tamil Nadu', []],
  ['Chitkara School of Planning and Architecture', 'Chitkara', 'Rajpura', 'Punjab', []],
  ['Lovely School of Architecture and Design, LPU', 'LPU', 'Phagwara', 'Punjab', []],
];

/** Inserts any listed college that is missing; existing records (and admin edits) are left alone. */
export async function seedColleges() {
  await College.bulkWrite(
    COLLEGES.map(([name, short, city, state, domains]) => ({
      updateOne: {
        filter: { slug: slugify(short) },
        update: { $setOnInsert: { name, short, city, state, domains } },
        upsert: true,
      },
    })),
  );
}
