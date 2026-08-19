import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Text style={styles.mainTitle}>V-CARE SOCIAL SERVICE TRUST</Text>
        
        <Text style={styles.description}>
          V-CARE SOCIAL SERVICE TRUST is a registered trust which started on 23rd August 2005. 
          Its registration Number is 1817/04/05. This is non-religious, non-political & non-profitable trust.
        </Text>

        <Text style={styles.sectionTitle}>OBJECTIVES</Text>
        <Text style={styles.bullet}>
          • To Construct, establish, maintain, develop, improve hospitals, clinics, dispensaries, maternity homes, rescue homes to help, treat all people without any distinction of caste, creed, color or community at free of cost.
        </Text>
        <Text style={styles.bullet}>
          • To create awareness about Blood donation and to run Blood Donation Camps.
        </Text>
        <Text style={styles.bullet}>
          • To establish, maintain, run, develop and improve the educational institutions, technical, industrial or otherwise including School, College, Medical College, Agricultural College, Workshop etc.
        </Text>

        <Text style={styles.sectionTitle}>PRESENT WORKS AND PROGRAMS</Text>
        <Text style={styles.bullet}>
          • Blood Donations: Donating Blood for needed people at any time as 24X7 services. We have around 1000 members of volunteer blood donators in both +ve and –ve groups.
        </Text>

        <Text style={styles.sectionTitle}>PAST WORKS AND PROGRAMS</Text>
        
        <Text style={styles.subsectionTitle}>Hospital</Text>
        <Text style={styles.description}>
          Running a V-CARE General Hospitals at No.14, East Veli Street, Madurai, for poor people. 
          About 25 Patients get treatment regularly. Free medicines provided by us for those who get treatment here.
        </Text>

        <Text style={styles.subsectionTitle}>Medical Camps</Text>
        
        <Text style={styles.campTitle}>Health Camp</Text>
        <Text style={styles.description}>
          Conducted Health Camp in Crime Branch, Madurai with the co-ordination of Madurai Meenakshi Mission hospital. 
          Around 400 people have benefited. We provided concession in cost for the people who need further treatment from Meenakshi Mission Hospital.
        </Text>

        <Text style={styles.campTitle}>ENT Camp</Text>
        <Text style={styles.description}>
          Conducted ENT camp in Nelpettai with the co-ordination of Rajathi ENT Hospital. Around 275 people benefited from that camp. 
          We have given concession in treatment at low cost for the people who need further treatment.
        </Text>

        <Text style={styles.campTitle}>EYE Camps</Text>
        <Text style={styles.description}>
          Conducted Eye Camp with the co-ordination of Madurai Meenakshi Mission hospital in East Veli Street, Madurai. 
          Around 285 people benefited from that camp. 16 patients were selected in that camp for free eye operation with 3 days free food and accommodation.
        </Text>
        <Text style={styles.description}>
          Conducted Eye Camp with the co-ordination of Madurai Meenakshi Mission hospital in Puliangudi village near by Madurai. 
          Around 125 people benefited from that camp. Free Medicines and Counseling were given to the needy in that eye camp.
        </Text>

        <Text style={styles.campTitle}>Blood Donation Camp</Text>
        <Text style={styles.description}>
          Conducted the Blood Donation Camp with Aircel in Madurai Aircel office and also in Trichy Aircel Office. 
          Around 100 Blood donors donated their blood in that blood camp. The collected blood was taken by the Madurai Government Rajaji Hospital blood bank team.
        </Text>

        <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
        <Text style={styles.bullet}>
          • Around 5000 out-patients benefited from our out-patient hospital for a year. We have provided free medicines for the people who get treatment in our hospital for the worth around Rs.1,00,000/- for last year.
        </Text>
        <Text style={styles.bullet}>• Donated 244 Units of blood in the year 2005-2006.</Text>
        <Text style={styles.bullet}>• Donated 256 Units of blood in the year 2006-2007.</Text>
        <Text style={styles.bullet}>• Donated 260 Units of blood in the year 2007-2008.</Text>
        <Text style={styles.bullet}>• Donated 250 Units of blood in the year 2008-2009.</Text>

        <Text style={styles.sectionTitle}>HONOURS</Text>
        <Text style={styles.bullet}>
          • Honored by Madurai District Collector in Madurai Rajaji Government Hospital for providing Blood services - On 01/10/2007 and 01/10/2008.
        </Text>
        <Text style={styles.bullet}>
          • Honored by Madurai Meenakshi Mission Hospital, for providing Best Blood Donating Services - On 01/10/2005, 01/10/2006, 01/10/2007, 01/10/2008 and 01/10/2009.
        </Text>
        <Text style={styles.bullet}>
          • Honored by Madurai Apollo Hospitals for providing Best Blood Donating Services – On 01/10/2005, 01/10/2007, 01/10/2008 and 01/10/2009.
        </Text>
        <Text style={styles.bullet}>
          • Honored by Madurai Vadamalayan Hospitals for providing Best Blood Donation Services – On 01/10/2008.
        </Text>
        <Text style={styles.description}>
          All these honors were given by these above Hospitals with the co-ordination of TANSACS (Tamil Nadu State AIDS Control Society) & Tamil Nadu State Blood Transfusion Council.
        </Text>

        <Text style={styles.sectionTitle}>OUR FUTURE VISION</Text>
        <Text style={styles.bullet}>
          • Develop and improve hospitals at low expenses and free of cost for poor people.
        </Text>
        <Text style={styles.bullet}>
          • Providing Ambulance Services, Establish Blood Banks, Lab Services, Scanning centers at free of cost.
        </Text>
        <Text style={styles.bullet}>
          • Uplift the rural public in the matter of Literacy, Self Employment, and Awareness of Health, Child Care, and Women's Welfare.
        </Text>
        <Text style={styles.bullet}>
          • Providing Emergency Relief for the people who affected by natural calamities such as earth quakes, floods, famine and Tsunami etc.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  container: {
    padding: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a73e8',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#1a73e8',
    paddingBottom: 4,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: '#555',
  },
  campTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
    color: '#666',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
    marginBottom: 6,
    marginLeft: 8,
  },
});
