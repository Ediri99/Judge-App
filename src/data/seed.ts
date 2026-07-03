import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AwardCategoryDoc, HallDoc, StallCategoryDoc, StallCriterionDoc, StallDoc, UniversityDoc, UniversityEntryDoc } from '../types';

const stallCriteria: StallCriterionDoc[] = [
  { name: 'Stall outlook', max: 10, weight: 1, order: 1, track: 'stalls' },
  { name: 'Innovative thinking', max: 10, weight: 1, order: 2, track: 'stalls' },
  { name: 'Eye-catching promotional / LED', max: 10, weight: 1, order: 3, track: 'stalls' },
  { name: 'Product information', max: 10, weight: 1, order: 4, track: 'stalls' },
  { name: 'Catalogue', max: 10, weight: 1, order: 5, track: 'stalls' },
  { name: 'Sampling', max: 10, weight: 1, order: 6, track: 'stalls' },
  { name: 'Customer engagement', max: 10, weight: 1, order: 7, track: 'stalls' },
  { name: 'Cleanliness', max: 10, weight: 1, order: 8, track: 'stalls' },
  { name: 'Presentation', max: 10, weight: 1, order: 9, track: 'stalls' },
  { name: 'Overall impact', max: 10, weight: 1, order: 10, track: 'stalls' },
];

const productCriteria: StallCriterionDoc[] = [
  { name: 'Innovation', max: 10, weight: 1, order: 1, track: 'universities' },
  { name: 'Market relevance', max: 10, weight: 1, order: 2, track: 'universities' },
  { name: 'Presentation', max: 10, weight: 1, order: 3, track: 'universities' },
  { name: 'Impact', max: 10, weight: 1, order: 4, track: 'universities' },
  { name: 'Scalability', max: 10, weight: 1, order: 5, track: 'universities' },
  { name: 'Commercial potential', max: 10, weight: 1, order: 6, track: 'universities' },
];

const processCriteria: StallCriterionDoc[] = [
  { name: 'Process design', max: 10, weight: 1, order: 1, track: 'universities' },
  { name: 'Efficiency', max: 10, weight: 1, order: 2, track: 'universities' },
  { name: 'Sustainability', max: 10, weight: 1, order: 3, track: 'universities' },
  { name: 'Transferability', max: 10, weight: 1, order: 4, track: 'universities' },
  { name: 'Impact', max: 10, weight: 1, order: 5, track: 'universities' },
  { name: 'Quality control', max: 10, weight: 1, order: 6, track: 'universities' },
];

const halls: HallDoc[] = [
  { name: 'Lobby', order: 1 },
  { name: 'Hall A', order: 2 },
  { name: 'Hall B', order: 3 },
  { name: 'Hall C', order: 4 },
];

const categories: StallCategoryDoc[] = [
  { name: 'Food', order: 1 },
  { name: 'Craft', order: 2 },
  { name: 'Services', order: 3 },
];

const universities: UniversityDoc[] = [
  { name: 'University A', eventId: 'demo-event' },
  { name: 'University B', eventId: 'demo-event' },
  { name: 'University C', eventId: 'demo-event' },
  { name: 'University D', eventId: 'demo-event' },
  { name: 'University E', eventId: 'demo-event' },
  { name: 'University F', eventId: 'demo-event' },
  { name: 'University G', eventId: 'demo-event' },
  { name: 'University H', eventId: 'demo-event' },
  { name: 'University I', eventId: 'demo-event' },
  { name: 'University J', eventId: 'demo-event' },
  { name: 'University K', eventId: 'demo-event' },
];

const awardCategories: AwardCategoryDoc[] = [
  { name: 'Most Innovative Product', type: 'product', order: 1, eventId: 'demo-event' },
  { name: 'Best Process Innovation', type: 'process', order: 2, eventId: 'demo-event' },
  { name: 'Most Sustainable', type: 'product', order: 3, eventId: 'demo-event' },
  { name: 'Best Student Team', type: 'process', order: 4, eventId: 'demo-event' },
  { name: 'Most Scalable', type: 'product', order: 5, eventId: 'demo-event' },
  { name: 'Best Presentation', type: 'process', order: 6, eventId: 'demo-event' },
];

const stalls: StallDoc[] = [
  { organization: 'Aussee Oats Milling', hallId: 'hall-a', categoryId: 'food', stallNo: 'A1', eventId: 'demo-event' },
  { organization: 'Bright Lane Crafts', hallId: 'hall-b', categoryId: 'craft', stallNo: 'B2', eventId: 'demo-event' },
  { organization: 'Northwind Services', hallId: 'hall-c', categoryId: 'services', stallNo: 'C3', eventId: 'demo-event' },
];

const entries: UniversityEntryDoc[] = [
  { universityId: 'university-a', awardCategoryId: 'award-1', type: 'product', name: 'Jackfruit protein bar', eventId: 'demo-event' },
  { universityId: 'university-b', awardCategoryId: 'award-2', type: 'process', name: 'Water-efficient fermentation', eventId: 'demo-event' },
];

export async function seedDemoData() {
  const eventRef = doc(collection(db, 'events'), 'demo-event');
  await setDoc(eventRef, {
    name: 'Annual food & craft expo 2026',
    year: 2026,
    activeTrack: 'stalls',
    enabledTracks: ['stalls', 'universities'],
    createdAt: new Date().toISOString(),
  });

  for (const hall of halls) {
    const ref = doc(collection(db, 'halls'), `hall-${hall.name.toLowerCase().replace(/\s+/g, '-')}`);
    await setDoc(ref, { ...hall, eventId: 'demo-event' });
  }

  for (const category of categories) {
    const ref = doc(collection(db, 'stallCategories'), category.name.toLowerCase());
    await setDoc(ref, { ...category, eventId: 'demo-event' });
  }

  for (const criterion of [...stallCriteria, ...productCriteria, ...processCriteria]) {
    const ref = doc(collection(db, 'stallCriteria'), `${criterion.track}-${criterion.order}`);
    await setDoc(ref, { ...criterion, eventId: 'demo-event' });
  }

  for (const university of universities) {
    const ref = doc(collection(db, 'universities'), `university-${university.name.toLowerCase().replace(/\s+/g, '-')}`);
    await setDoc(ref, { ...university, eventId: 'demo-event' });
  }

  for (const awardCategory of awardCategories) {
    const ref = doc(collection(db, 'awardCategories'), `award-${awardCategory.order}`);
    await setDoc(ref, { ...awardCategory, eventId: 'demo-event' });
  }

  for (const stall of stalls) {
    const ref = doc(collection(db, 'stalls'), `${stall.organization.toLowerCase().replace(/\s+/g, '-')}`);
    await setDoc(ref, { ...stall, eventId: 'demo-event' });
  }

  for (const entry of entries) {
    const ref = doc(collection(db, 'entries'), `${entry.universityId}-${entry.awardCategoryId}`);
    await setDoc(ref, { ...entry, eventId: 'demo-event' });
  }
}
