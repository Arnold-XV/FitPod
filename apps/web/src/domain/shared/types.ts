// COMMENTED OUT - Module pangan dihapus karena keterbatasan dan masalah database
// export type Category = 'body' | 'routines' | 'sessions' | 'nutrition-summary' | 'injuries' | 'trainer-summary' | 'prescriptions';
export type Category = 'body' | 'routines' | 'sessions' | 'injuries' | 'trainer-summary' | 'prescriptions';

export type Visibility = 'private' | 'friends' | 'public';

// COMMENTED OUT - Module pangan dihapus
// export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type ExerciseSource = 'free-exercise-db' | 'wger' | 'custom';

export type IntensityLevel = 'light' | 'moderate' | 'vigorous';

export type PrescriptionType = 'program' | 'mealPlan' | 'note' | 'referralRequest' | 'clinicalNote';

export type GrantStatus = 'active' | 'expired' | 'revoked';

export type ClearanceStatus = 'cleared' | 'clearanceRecommended' | 'notScreened';