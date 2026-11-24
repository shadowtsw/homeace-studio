import type { Catalog } from "./catalog";

/** French texts (machine-assisted, improvements welcome). Placeholders like `{path}` come from `data.params`. */
export const CATALOG_FR: Catalog = {
  OK: "Terminé.",
  CREATED: "Créé.",
  VALIDATION_FAILED: "La saisie n'est pas valide.",
  NOT_FOUND: "Introuvable.",
  CONFLICT: "Cela entre en conflit avec l'état actuel.",
  REQUEST_FAILED: "La requête n'a pas pu être traitée.",
  INTERNAL_ERROR: "Une erreur inattendue s'est produite.",

  INVALID_VALUE: "Valeur non valide.",
  IS_NOT_EMPTY: "Ne doit pas être vide.",
  IS_STRING: "Doit être un texte.",
  MIN_LENGTH: "Le texte est trop court.",
  MAX_LENGTH: "Le texte est trop long.",
  IS_IN: "Cette valeur n'est pas autorisée.",
  IS_OBJECT: "Structure non valide.",
  IS_BOOLEAN: "Doit être oui ou non.",
  IS_ARRAY: "Doit être une liste.",
  MATCHES: "N'a pas le format attendu.",

  ENTRY_NOT_FOUND: "Home Assistant n'a pas d'élément {entityId}.",
  ENTRY_RENAMED: "ID d'entité modifié.",
  ENTRY_DUPLICATED: "Copie créée.",
  ENTRY_ID_INVALID:
    "« {entityId} » ne convient pas comme ID d'entité : uniquement des minuscules, des chiffres et _, même domaine qu'avant.",
  ENTRY_ID_TAKEN: "L'ID d'entité « {entityId} » existe déjà.",
  ENTRY_NOT_IN_REGISTRY:
    "{entityId} provient du YAML sans unique_id et ne peut pas être placé dans une catégorie.",
  ENTRY_MOVED: "Déplacé.",
  ENTRY_UPDATED: "Enregistré.",
  ENTRY_ACTION_DONE: "Terminé.",
  ENTRY_ACTION_UNSUPPORTED: "« {action} » ne fonctionne pas pour {entityId}.",
  ENTRY_EXTRAS_SAVED: "Enregistré.",

  CATEGORY_PATH_INVALID:
    "« {path} » n'est pas un nom de catégorie valide. Aucun niveau ne doit être vide.",
  CATEGORY_NAME_TAKEN: "La catégorie « {path} » existe déjà.",
  CATEGORY_MOVE_INTO_ITSELF: "Une catégorie ne peut pas être déplacée dans elle-même.",
  CATEGORY_RENAMED: "Renommé.",
  CLEANUP_APPLIED: "Catégories converties.",
  CLEANUP_IGNORED: "Ne sera plus proposé.",
  CLEANUP_RESTORED: "Les propositions masquées sont de retour.",
  CLEANUP_DUPLICATE: "« {path} » figure plusieurs fois dans la liste.",

  AREA_CREATED: "Pièce créée.",
  AREA_UPDATED: "Pièce enregistrée.",
  AREA_DELETED: "Pièce supprimée.",
  AREA_NAME_TAKEN: "Il existe déjà une pièce « {name} ».",
  AREA_NOT_FOUND: "Home Assistant n'a pas (ou plus) cette pièce.",

  FOLDER_CREATED: "Dossier créé.",
  FOLDER_DELETED: "Dossier supprimé.",
  FOLDER_EXISTS: "Le dossier « {path} » existe déjà.",
  FOLDER_NOT_FOUND: "Il n'y a pas de dossier « {path} ».",
  FOLDER_ORDER_SAVED: "Ordre enregistré.",
  FOLDER_COLOR_SAVED: "Couleur enregistrée.",

  HELPER_CREATED: "Entrée créée.",
  HELPER_SETTINGS_INVALID: "Le réglage « {field} » n'est pas valide.",
  HELPER_NOT_EDITABLE:
    "{entityId} ne peut pas encore être réglé ici. Les entrées de type modèle et groupe viendront plus tard ; d'ici là, dans Home Assistant.",
  HELPER_SETTINGS_SAVED: "Réglages enregistrés dans Home Assistant.",
  HELPER_DELETED: "Entrée supprimée.",
  FLOW_UNSUPPORTED:
    "{entityId} n'a pas de déroulement. Seules les automatisations et les scripts en ont un.",
  FLOW_SAVED: "Déroulement enregistré dans Home Assistant.",
  FLOW_NOT_EDITABLE:
    "{entityId} ne peut pas être modifié ni supprimé ici. Home Assistant ne le conserve pas dans automations.yaml ou scripts.yaml (il provient par ex. d'un package ou d'un blueprint).",
  FLOW_INVALID: "Home Assistant a refusé le déroulement : {reason}",
  FLOW_CREATED: "Créé dans Home Assistant.",
  TRACES_KEPT: "Home Assistant conserve désormais les {count} dernières exécutions.",
  FLOW_DELETED: "Supprimé dans Home Assistant.",

  MCP_SAVED: "Enregistré.",
  MCP_TOKEN_RENEWED: "Nouveau jeton créé. L'ancien ne fonctionne plus.",
  AI_PLAN_APPLIED: "Plan appliqué.",
  AI_PLAN_REJECTED: "Plan refusé.",
  AI_PLAN_NOT_FOUND: "Ce plan n'existe plus.",
  AI_PLAN_CLOSED: "Ce plan a déjà été tranché.",
  AI_OPERATION_FAILED: "Cette étape n'a pas fonctionné dans Home Assistant.",

  CHECKUP_IGNORED: "Ne sera plus signalé.",
  CHECKUP_RESTORED: "Les constats masqués sont de retour.",
  HELPER_NOT_DELETABLE:
    "{entityId} ne peut pas être supprimé ici. Pour l'instant, supprimez les entrées de type modèle et groupe dans Home Assistant.",
};
