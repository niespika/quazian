# Quazian – Product Spec

## Objectif
Webapp de quiz bayésien pour suivre la progression des élèves.

## Rôles
- Prof
- Élève

## Comptes
- Import CSV (nom, classe, email)
- Email d’invitation
- Création mot de passe par l’élève

## Concepts
- Matière
- Nom du concept
- Bonne définition
- Minimum 9 distracteurs
- Date vue en cours

## Quiz
- 2 quiz par semaine
- 4 à 10 questions
- Mélange des matières
- 1 bonne réponse + 3 distracteurs choisis automatiquement

## Réponses élève
- Distribution de probabilités
- Somme = 100%

## Scoring
Score question :
1 - Σ(p_i - y_i)^2

Score quiz :
Normalisé puis ramené sur [-4,+4]

## Notes
- Z-score interne
- Note finale /20
- Élève voit : score quiz, note finale, concepts maîtrisés
- Prof voit : participation, scores, note finale

