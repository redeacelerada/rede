# TODO List for Rede Acelerada - Refine Access Logic

## Completed
- [x] Create index.html with forms and dashboard
- [x] Create app.js with Firebase init, auth, registration, basic access logic
- [x] Create style.css for basic styling
- [x] Create manifest.json for PWA
- [x] Create sw.js for service worker
- [x] Add admin dashboard with user creation, list, edit/delete

## Pending
- [ ] Refine access logic for 3rd, 4th, and 5th+ generations in app.js
- [ ] Update Firestore security rules to allow authenticated users to read/write necessary data
- [ ] Test registration and login locally
- [ ] Test hierarchy and access unlocking
- [ ] Handle edge cases in access logic (e.g., counting per generation)
- [ ] Add error handling and user feedback
- [ ] Optimize queries for large hierarchies
- [ ] Implement full CRUD for admin (edit user details)

## Current Task Steps
- [x] Analyze current getUnlockedContacts function in app.js
- [x] Implement logic for 3rd generation unlocking (great-grandchildren if >=10 grandchildren)
- [x] Implement logic for 4th generation unlocking (great-great-grandchildren if >=10 great-grandchildren)
- [x] Refine logic for 5th+ generation unlocking (every 4 keys, unlock recent users)
- [x] Update Firestore rules to allow reading user data for unlocked contacts
- [ ] Test the refined access logic
