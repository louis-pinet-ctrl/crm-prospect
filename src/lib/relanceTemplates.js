import { getTypeDossierLabel } from './constants'

/**
 * Génère des messages de relance contextuels et personnalisés
 * basés sur le profil complet du prospect et son historique.
 */

// --- Helpers ---

function getPrenom(nom) {
  if (!nom) return ''
  // Si c'est "M. Dupont" ou "Mme Martin", garder tel quel
  if (/^(M\.|Mme|Mr|Maître)/i.test(nom)) return nom
  // Sinon prendre le premier mot comme prénom
  return nom.split(' ')[0]
}

function getTypeDossierContext(p) {
  switch (p.type_dossier) {
    case 'cession_fonds':
      return p.intention === 'cedant'
        ? 'la cession de votre fonds de commerce'
        : p.intention === 'acquereur'
          ? 'votre projet d\'acquisition de fonds de commerce'
          : 'votre projet de cession de fonds de commerce'
    case 'cession_droit_bail':
      return 'la cession de votre droit au bail'
    case 'bail_nu':
      return 'votre bail commercial'
    case 'franchise':
      return 'votre projet de franchise'
    case 'liquidation':
      return 'votre dossier de liquidation'
    case 'contentieux':
      return 'votre dossier contentieux'
    default:
      return 'votre dossier juridique'
  }
}

function getProfilContext(p) {
  const parts = []
  if (p.etablissement) parts.push(p.etablissement)
  if (p.type_cuisine) {
    const cuisines = {
      traditionnelle: 'cuisine traditionnelle',
      gastronomique: 'cuisine gastronomique',
      bistronomique: 'cuisine bistronomique',
      brasserie: 'brasserie',
      fast_food: 'restauration rapide',
      pizzeria: 'pizzeria',
      asiatique: 'cuisine asiatique',
      italien: 'cuisine italienne',
      bar_restaurant: 'bar-restaurant',
      traiteur: 'traiteur',
      dark_kitchen: 'dark kitchen',
    }
    parts.push(cuisines[p.type_cuisine] || p.type_cuisine)
  }
  return parts.join(' — ')
}

function getCuisineLabel(typeCuisine) {
  const map = {
    traditionnelle: 'traditionnelle',
    gastronomique: 'gastronomique',
    bistronomique: 'bistronomique',
    brasserie: 'brasserie',
    fast_food: 'restauration rapide',
    pizzeria: 'pizzeria',
    asiatique: 'asiatique',
    italien: 'italienne',
    bar_restaurant: 'bar-restaurant',
    traiteur: 'traiteur',
    dark_kitchen: 'dark kitchen',
  }
  return map[typeCuisine] || typeCuisine
}

/** Extrait les infos structurées du source_detail (pipe-séparé) */
function parseSourceDetail(p) {
  const detail = p.source_detail || ''
  const data = {}
  for (const part of detail.split(' | ')) {
    const [key, ...rest] = part.split(': ')
    if (key && rest.length) data[key.trim()] = rest.join(': ').trim()
  }
  return data
}

function getDaysSinceLastInteraction(p) {
  const last = p.date_derniere_interaction || p.date_creation
  if (!last) return null
  return Math.round((new Date() - new Date(last)) / (1000 * 60 * 60 * 24))
}

function getRelanceIntensity(p) {
  const count = p.nombre_relances_effectuees || 0
  if (count === 0) return 'first'
  if (count <= 2) return 'early'
  if (count <= 4) return 'mid'
  return 'late'
}

// --- Générateurs de messages ---

function buildSubject(p) {
  const typeDossier = getTypeDossierLabel(p.type_dossier)
  const intensity = getRelanceIntensity(p)

  switch (p.statut) {
    case 'lead_simulateur': {
      const simuSubj = parseSourceDetail(p)
      const typeSubj = (simuSubj.Type || '').toLowerCase()
      const isECSubj = typeSubj === 'expert-comptable' || typeSubj === 'expert comptable'
      const isInterSubj = typeSubj === 'agent immobilier' || typeSubj === 'avocat' || typeSubj === 'conseiller'

      if (isECSubj || isInterSubj) {
        if (intensity === 'first') return `Simulation de valorisation — accompagnement juridique cession restaurant`
        if (intensity === 'early') return `Suite simulation de valorisation — point juridique`
        return `Votre client a-t-il avancé sur son projet de cession ?`
      }
      if (intensity === 'first') {
        if (p.type_cuisine) {
          return `Votre ${getCuisineLabel(p.type_cuisine)} — quelques observations sur votre estimation`
        }
        return `${p.nom} — quelques observations sur votre estimation`
      }
      if (intensity === 'early') return `${p.nom} — un point qui pourrait vous être utile`
      return `${p.nom} — votre projet de cession`
    }
    case 'prospect_identifie':
      return `${p.nom} — Accompagnement juridique pour votre restaurant`
    case 'premier_contact':
      if (intensity === 'first') return `${p.nom} — Suite à notre échange`
      return `${p.nom} — Des nouvelles de votre projet ?`
    case 'diagnostic_rdv':
      return `${p.nom} — Suite à notre rendez-vous`
    case 'relance_en_attente':
      if (intensity === 'late') return `${p.nom} — Je reste à votre disposition`
      return `${p.nom} — Avancement de votre dossier`
    case 'deal_maturation':
      return `${p.nom} — Point sur votre projet`
    case 'lettre_mission_envoyee':
      return `${p.nom} — Votre lettre de mission`
    case 'negociation':
      return `${p.nom} — Suite de nos échanges`
    case 'prescripteur':
      return `Prise de nouvelles — Collaboration`
    case 'suivi_long_terme':
      return `${p.nom} — Votre projet de ${typeDossier.toLowerCase()}`
    default:
      return `${p.nom} — ${typeDossier}`
  }
}

function buildEmailBody(p) {
  const prenom = getPrenom(p.nom)
  const context = getTypeDossierContext(p)
  const profil = getProfilContext(p)
  const intensity = getRelanceIntensity(p)
  const daysSince = getDaysSinceLastInteraction(p)

  const lines = []

  // Salutation
  lines.push(`Bonjour ${prenom},`)
  lines.push('')

  switch (p.statut) {
    case 'lead_simulateur': {
      const simuData = parseSourceDetail(p)
      const typeUser = (simuData.Type || '').toLowerCase()
      const isInvestisseur = typeUser === 'investisseur'
      const isEC = typeUser === 'expert-comptable' || typeUser === 'expert comptable'
      const isIntermediaire = typeUser === 'agent immobilier' || typeUser === 'avocat' || typeUser === 'conseiller'
      // Par défaut : restaurateur / exploitant / franchisé
      const isRestaurateur = !isInvestisseur && !isEC && !isIntermediaire

      const hasSalaries = p.nombre_salaries > 0
      const hasCA = p.ca_annuel_declare > 0
      const hasLoyer = p.loyer_mensuel > 0
      const cuisine = p.type_cuisine ? getCuisineLabel(p.type_cuisine) : null
      const estimation = p.simulateur_estimation

      if (intensity === 'first') {

        if (isRestaurateur) {
          // ===== RESTAURATEUR / EXPLOITANT — premier email =====

          // 1) S'intéresser : montrer qu'on a regardé sa situation
          if (cuisine && estimation) {
            lines.push(
              `J'ai vu que vous aviez fait une estimation de valorisation pour votre activité en ${cuisine}` +
              (p.etablissement ? ` (${p.etablissement})` : '') +
              ` — le simulateur vous a donné une médiane autour de ${formatAmount(estimation)}.`
            )
          } else if (estimation) {
            lines.push(
              `J'ai vu que vous aviez utilisé le simulateur de valorisation` +
              (p.etablissement ? ` pour ${p.etablissement}` : '') +
              ` — estimation médiane autour de ${formatAmount(estimation)}.`
            )
          } else {
            lines.push(
              `J'ai vu que vous aviez utilisé le simulateur de valorisation` +
              (p.etablissement ? ` pour ${p.etablissement}` : ' pour estimer la valeur de votre fonds') + `.`
            )
          }
          lines.push('')

          // Observation personnalisée à partir des données
          if (hasCA && hasLoyer) {
            const ratioLoyer = Math.round((p.loyer_mensuel * 12) / p.ca_annuel_declare * 100)
            if (ratioLoyer > 12) {
              lines.push(
                `En regardant vos chiffres, je note que votre loyer représente environ ${ratioLoyer}% de votre CA — ` +
                `c'est un point qui pèse souvent dans la négociation avec un acquéreur, et sur lequel ` +
                `il y a parfois des leviers juridiques (renégociation au renouvellement, déplafonnement contestable, etc.).`
              )
            } else {
              lines.push(
                `Votre ratio loyer/CA est bien positionné (environ ${ratioLoyer}%) — c'est un vrai atout ` +
                `pour la valorisation et ça facilite les discussions avec les acquéreurs potentiels.`
              )
            }
            lines.push('')
          } else if (hasSalaries && p.nombre_salaries >= 3) {
            lines.push(
              `Avec ${p.nombre_salaries} salariés, la question du transfert des contrats de travail ` +
              `sera centrale dans la cession — c'est un point que les acquéreurs regardent de près ` +
              `et qui peut impacter la valorisation.`
            )
            lines.push('')
          }

          // 2) Ce que je fais — des faits, centré sur la plus-value
          lines.push(
            `Je suis Louis Pinet, avocat spécialisé dans la cession de fonds de commerce en restauration. ` +
            `Mon travail au quotidien, c'est d'auditer les baux commerciaux, d'identifier ce qui valorise ` +
            `ou fragilise un fonds, et de rédiger des actes de cession qui protègent le vendeur — ` +
            `notamment sur les garanties, les conditions suspensives et les clauses de non-concurrence.`
          )
          lines.push('')

          // 3) Proposition sans pression
          lines.push(
            `Si vous êtes en réflexion sur une cession, je peux vous faire un retour de 10 minutes ` +
            `sur votre estimation — ce qui la tire vers le haut, ce qui la fragilise, et les points ` +
            `du bail à vérifier avant de fixer un prix.`
          )
          lines.push('')
          lines.push(
            `C'est gratuit et sans engagement. L'idée c'est simplement de vous donner de la visibilité ` +
            `pour avancer en connaissance de cause.`
          )

        } else if (isInvestisseur) {
          // ===== INVESTISSEUR — premier email =====

          // 1) S'intéresser : reconnaître le profil investisseur
          lines.push(
            `J'ai vu que vous aviez utilisé le simulateur de valorisation` +
            (cuisine ? ` sur un fonds en ${cuisine}` : '') +
            (estimation ? ` — estimation autour de ${formatAmount(estimation)}` : '') +
            `.`
          )
          lines.push('')

          // 2) Faits concrets adaptés à un investisseur
          lines.push(
            `Je suis Louis Pinet, avocat spécialisé dans la cession de fonds de commerce en restauration. ` +
            `Côté acquéreur, mon travail c'est d'auditer le bail commercial (durée restante, destination, ` +
            `charges, clauses de sortie), de vérifier les conformités qui impactent la valeur réelle du fonds ` +
            `(ERP, licence, extraction), et de négocier un acte de cession avec les bonnes garanties.`
          )
          lines.push('')

          // 3) Proposition orientée investisseur
          lines.push(
            `Si vous étudiez cette opportunité, je peux vous donner en 10 minutes un premier retour ` +
            `sur les points qui impactent la valorisation et le risque — ce que le bail dit vraiment, ` +
            `les conformités à vérifier, et ce qu'il faut négocier dans l'acte.`
          )
          lines.push('')
          lines.push(
            `C'est gratuit et sans engagement. L'objectif c'est de vous donner les éléments concrets ` +
            `pour décider si l'opération tient la route.`
          )

        } else if (isEC) {
          // ===== EXPERT-COMPTABLE — premier email =====

          // 1) S'intéresser : reconnaître le rôle du EC
          lines.push(
            `J'ai vu qu'une simulation de valorisation avait été réalisée via notre outil` +
            (estimation ? ` (estimation autour de ${formatAmount(estimation)})` : '') +
            `. Je me permets de vous contacter car le profil renseigné indique que vous êtes expert-comptable — ` +
            `j'imagine que cette estimation concerne l'un de vos clients.`
          )
          lines.push('')

          // 2) Faits : ce que je fais pour les clients de EC
          lines.push(
            `Je suis Louis Pinet, avocat spécialisé dans la cession de fonds de commerce en restauration. ` +
            `Je travaille régulièrement en binôme avec des experts-comptables sur ces dossiers : ` +
            `pendant que vous sécurisez la partie financière et fiscale, j'interviens sur l'audit du bail, ` +
            `la valorisation juridique du fonds, et la rédaction d'un acte de cession qui protège votre client.`
          )
          lines.push('')

          // 3) Proposition : faciliter la vie du EC
          lines.push(
            `Si votre client envisage une cession ou une acquisition, je serais ravi d'échanger 10 minutes ` +
            `avec vous pour voir comment nos interventions pourraient se coordonner. ` +
            `C'est sans engagement — et ça peut faire gagner du temps à tout le monde.`
          )

        } else if (isIntermediaire) {
          // ===== INTERMÉDIAIRE (agent immo, avocat, conseiller) — premier email =====

          const roleLabel = typeUser === 'agent immobilier' ? 'agent immobilier'
            : typeUser === 'avocat' ? 'avocat'
            : 'conseiller'

          // 1) S'intéresser
          lines.push(
            `J'ai vu qu'une simulation de valorisation avait été réalisée via notre outil` +
            (estimation ? ` (estimation autour de ${formatAmount(estimation)})` : '') +
            `. Votre profil indique que vous êtes ${roleLabel} — ` +
            `je suppose que vous accompagnez un client sur ce dossier.`
          )
          lines.push('')

          // 2) Faits
          lines.push(
            `Je suis Louis Pinet, avocat spécialisé dans la cession de fonds de commerce en restauration. ` +
            `J'interviens sur l'audit du bail commercial, la valorisation juridique du fonds, ` +
            `et la rédaction de l'acte de cession. Je travaille régulièrement en coordination ` +
            `avec des ${roleLabel}s sur ces dossiers.`
          )
          lines.push('')

          // 3) Proposition
          lines.push(
            `Si votre client a un projet en cours, je serais ravi d'en discuter 10 minutes avec vous ` +
            `pour voir si un accompagnement juridique serait pertinent. C'est sans engagement, ` +
            `et ça nous permettrait d'évaluer ensemble les points d'attention du dossier.`
          )
        }

      } else if (intensity === 'early') {
        // --- RELANCE 2-3 : apporter de la valeur concrète ---
        if (isEC || isIntermediaire) {
          lines.push(
            `Je vous avais contacté suite à une simulation de valorisation réalisée via notre outil` +
            (estimation ? ` (autour de ${formatAmount(estimation)})` : '') +
            `.`
          )
          lines.push('')
          lines.push(
            `Votre client a-t-il avancé dans sa réflexion ? Si le dossier est toujours d'actualité, ` +
            `je peux vous proposer un point rapide sur les aspects juridiques à anticiper — ` +
            `bail, conformités, clauses sensibles. C'est sans engagement et ça prend 10 minutes.`
          )
        } else {
          lines.push(
            `Je vous avais contacté suite à votre estimation de valorisation` +
            (estimation ? ` (autour de ${formatAmount(estimation)})` : '') +
            `.`
          )
          lines.push('')

          // Apporter un fait utile selon le type de cuisine
          if (cuisine === 'brasserie' || cuisine === 'traditionnelle') {
            lines.push(
              `Un point que je vois souvent sur les cessions de ${cuisine} : la clause de destination du bail ` +
              `peut réduire significativement le nombre d'acquéreurs potentiels (et donc le prix). ` +
              `C'est vérifiable en 5 minutes et ça vaut le coup de le savoir avant de fixer un prix de vente.`
            )
          } else if (cuisine === 'restauration rapide' || cuisine === 'pizzeria') {
            lines.push(
              `Sur les cessions en ${cuisine}, un point revient souvent : la conformité de l'extraction ` +
              `et la licence. Un acquéreur sérieux fera vérifier ces points et ils peuvent devenir ` +
              `des leviers de négociation à la baisse si ce n'est pas en ordre.`
            )
          } else if (isInvestisseur) {
            lines.push(
              `Un point que je vois souvent côté acquéreur : le bail commercial contient des clauses ` +
              `(destination, agrément du bailleur, droit de préemption) qui peuvent bloquer ou retarder ` +
              `une opération si elles ne sont pas identifiées en amont. ` +
              `Un audit rapide du bail permet d'évaluer le risque avant de s'engager.`
            )
          } else {
            lines.push(
              `Un point que j'observe régulièrement sur les cessions : le bail commercial contient souvent ` +
              `des clauses (destination, agrément, droit de préemption du bailleur) qui peuvent compliquer ` +
              `ou retarder la vente si elles ne sont pas identifiées en amont.`
            )
          }
          lines.push('')
          lines.push(
            `Si ça vous intéresse, je peux jeter un œil à votre situation et vous dire en 10 minutes ` +
            `ce qu'il en est. C'est sans engagement et ça peut vous éviter des surprises le moment venu.`
          )
        }

      } else {
        // --- RELANCE 4+ : léger, respectueux, porte ouverte ---
        if (isEC || isIntermediaire) {
          lines.push(
            `Je vous avais contacté il y a quelque temps suite à une simulation de valorisation.`
          )
          lines.push('')
          lines.push(
            `Si le dossier de votre client est toujours d'actualité — ou si un autre dossier se présente — ` +
            `n'hésitez pas à me contacter. Je suis disponible pour un point rapide sur les aspects juridiques.`
          )
        } else {
          lines.push(
            `Je vous avais contacté il y a quelque temps suite à votre simulation de valorisation.`
          )
          lines.push('')
          lines.push(
            `Je comprends que le timing n'est peut-être pas le bon — ` +
            (isInvestisseur
              ? `ce type d'opération demande de la réflexion et le bon dossier.`
              : `une cession, ça se mûrit.`)
          )
          lines.push('')
          lines.push(
            `Si le sujet redevient d'actualité, vous pouvez me joindre directement. ` +
            `Je pourrai vous faire un point rapide sur votre situation et sur ce qui a pu évoluer côté marché.`
          )
        }
      }
      break
    }

    case 'prospect_identifie':
      lines.push(
        `Je me permets de vous contacter car je suis avocat spécialisé dans l'accompagnement des restaurateurs.`
      )
      lines.push('')
      if (p.simulateur_valorisation) {
        lines.push(
          `J'ai bien reçu les résultats de votre simulation de valorisation` +
          (p.simulateur_estimation ? ` (estimation autour de ${formatAmount(p.simulateur_estimation)})` : '') +
          `. C'est une première étape importante pour bien préparer ${context}.`
        )
      } else if (p.diaglocal) {
        lines.push(
          `J'ai vu que vous aviez utilisé notre outil DiagLocal pour analyser votre emplacement. ` +
          `C'est un excellent réflexe avant de se lancer dans ${context}.`
        )
      } else {
        lines.push(
          `Je comprends que vous avez un projet lié à ${context}` +
          (profil ? ` pour ${profil}` : '') +
          `.`
        )
      }
      lines.push('')
      lines.push(
        `Pour ce type de dossier, un accompagnement juridique en amont permet d'éviter de nombreux écueils ` +
        `(clauses du bail, conformités, valorisation, négociation...).`
      )
      lines.push('')
      lines.push(
        `Seriez-vous disponible pour un premier échange téléphonique de 15 minutes, sans engagement ? ` +
        `Cela me permettrait de mieux comprendre votre situation et de vous donner un premier éclairage.`
      )
      break

    case 'premier_contact':
      if (intensity === 'first') {
        lines.push(
          `Je reviens vers vous suite à notre premier échange concernant ${context}.`
        )
        lines.push('')
        lines.push(
          `J'espère que les premières informations que je vous ai transmises vous ont été utiles. ` +
          `Je souhaitais savoir si vous aviez eu le temps d'y réfléchir et si des questions sont apparues.`
        )
      } else {
        lines.push(
          `Je me permets de revenir vers vous — je sais que ${context} est un sujet important ` +
          `qui demande de la réflexion.`
        )
        lines.push('')
        if (daysSince && daysSince > 21) {
          lines.push(
            `Depuis notre dernier échange il y a ${daysSince} jours, votre situation a peut-être évolué. ` +
            `N'hésitez pas à me solliciter si de nouvelles questions se posent.`
          )
        } else {
          lines.push(
            `Avez-vous eu le temps de réfléchir aux points que nous avions évoqués ? ` +
            `Je reste disponible pour en discuter quand vous le souhaitez.`
          )
        }
      }
      lines.push('')
      if (!p.guide_recu) {
        lines.push(
          `Par ailleurs, j'ai rédigé un guide pratique sur les points juridiques essentiels ` +
          `à connaître dans le cadre d'une ${getTypeDossierLabel(p.type_dossier).toLowerCase()}. ` +
          `Souhaitez-vous que je vous l'envoie ?`
        )
      }
      break

    case 'diagnostic_rdv':
      lines.push(
        `Je reviens vers vous suite à notre rendez-vous de diagnostic.`
      )
      lines.push('')
      lines.push(
        `Comme nous en avons discuté, ${context} implique plusieurs étapes clés ` +
        `qu'il est important de sécuriser juridiquement` +
        (p.type_dossier === 'cession_fonds'
          ? ` : audit du bail, conformités, valorisation, rédaction de l'acte de cession...`
          : ` pour protéger vos intérêts.`)
      )
      lines.push('')
      if (p.a_expert_comptable && p.nom_expert_comptable) {
        lines.push(
          `Je reste également disponible pour échanger avec votre expert-comptable ` +
          `(${p.nom_expert_comptable}) afin de coordonner nos interventions.`
        )
        lines.push('')
      }
      lines.push(
        `Avez-vous pu réfléchir à la suite ? Je suis à votre disposition pour répondre ` +
        `à vos questions et, si vous le souhaitez, formaliser notre collaboration.`
      )
      break

    case 'relance_en_attente':
      if (intensity === 'early') {
        lines.push(
          `Je me permets de revenir vers vous concernant ${context}.`
        )
        lines.push('')
        lines.push(
          `Je comprends que ce type de décision demande du temps. ` +
          `En attendant, sachez que je reste disponible pour tout éclairage complémentaire.`
        )
      } else if (intensity === 'mid') {
        lines.push(
          `Je souhaitais simplement prendre de vos nouvelles concernant votre projet.`
        )
        lines.push('')
        if (p.type_dossier === 'cession_fonds') {
          lines.push(
            `Le marché de la cession en restauration évolue — les délais, les conditions de financement ` +
            `et les attentes des acquéreurs peuvent changer rapidement. Si votre projet est toujours d'actualité, ` +
            `un point rapide pourrait être utile.`
          )
        } else {
          lines.push(
            `Si votre projet est toujours d'actualité, un point rapide nous permettrait ` +
            `de faire le tour des éventuels changements et d'adapter notre approche.`
          )
        }
      } else {
        lines.push(
          `Cela fait un moment que nous n'avons pas échangé et je voulais vous assurer ` +
          `que je reste à votre entière disposition.`
        )
        lines.push('')
        lines.push(
          `Si votre situation a évolué ou si vos priorités ont changé, je le comprends parfaitement. ` +
          `Dans tous les cas, n'hésitez pas à revenir vers moi le moment venu — ` +
          `ce type de dossier nécessite souvent une préparation en amont.`
        )
      }
      break

    case 'deal_maturation':
      lines.push(
        `Je souhaitais faire un point avec vous concernant ${context}.`
      )
      lines.push('')
      lines.push(
        `Je sais que ce type de projet nécessite du temps et que les conditions ` +
        `doivent être réunies. De mon côté, je continue à suivre votre dossier ` +
        `et je reste mobilisé pour le moment où vous serez prêt à avancer.`
      )
      lines.push('')
      lines.push(
        `Y a-t-il eu des évolutions de votre côté ? Un rapide échange téléphonique ` +
        `nous permettrait de faire le point.`
      )
      break

    case 'lettre_mission_envoyee':
      lines.push(
        `Je reviens vers vous concernant la lettre de mission que je vous ai adressée pour ${context}.`
      )
      lines.push('')
      if (intensity === 'first') {
        lines.push(
          `Avez-vous eu le temps de la consulter ? C'est un document important qui formalise ` +
          `le périmètre de mon intervention, les honoraires et le calendrier prévisionnel.`
        )
        lines.push('')
        lines.push(
          `Si certains points méritent des éclaircissements ou si vous souhaitez en discuter, ` +
          `je suis bien sûr disponible.`
        )
      } else {
        lines.push(
          `Je reste disponible si vous avez des questions sur le contenu ou les conditions. ` +
          `N'hésitez pas à me faire part de vos éventuelles remarques — ` +
          `la lettre de mission peut tout à fait être adaptée à vos besoins.`
        )
      }
      break

    case 'negociation':
      lines.push(
        `Je reviens vers vous suite à nos derniers échanges concernant ${context}.`
      )
      lines.push('')
      lines.push(
        `Avez-vous pu réfléchir aux points que nous avons abordés ? ` +
        `Je suis ouvert à en discuter pour trouver un cadre qui vous convienne.`
      )
      lines.push('')
      lines.push(
        `N'hésitez pas à me faire part de vos questions ou ajustements souhaités — ` +
        `l'objectif est de démarrer dans les meilleures conditions.`
      )
      break

    case 'prescripteur':
      lines.push(
        `Je souhaitais prendre de vos nouvelles et vous remercier pour notre collaboration.`
      )
      lines.push('')
      if (p.nombre_deals_apportes > 0) {
        lines.push(
          `Les ${p.nombre_deals_apportes} dossier${p.nombre_deals_apportes > 1 ? 's' : ''} ` +
          `que vous m'avez orienté${p.nombre_deals_apportes > 1 ? 's' : ''} se sont très bien passé${p.nombre_deals_apportes > 1 ? 's' : ''}, ` +
          `et vos clients ont été satisfaits de l'accompagnement.`
        )
        lines.push('')
      }
      lines.push(
        `Si parmi vos clients ou contacts actuels, certains ont un projet de cession, ` +
        `d'acquisition ou une problématique liée à leur bail commercial, ` +
        `n'hésitez pas à leur proposer un échange. Je prendrai le temps de bien comprendre leur situation.`
      )
      break

    case 'suivi_long_terme':
      lines.push(
        `Je prends de vos nouvelles — cela fait un moment que nous n'avons pas échangé.`
      )
      lines.push('')
      lines.push(
        `Votre projet de ${context} est peut-être encore en réflexion, et c'est tout à fait normal. ` +
        `Ce type de décision se mûrit.`
      )
      lines.push('')
      if (p.type_dossier === 'cession_fonds') {
        lines.push(
          `Si entre-temps vous avez besoin d'une mise à jour de votre valorisation ` +
          `ou d'un point sur les conditions actuelles du marché de la cession en restauration, ` +
          `je suis à votre disposition.`
        )
      } else {
        lines.push(
          `Si votre situation a évolué ou si de nouvelles questions juridiques se posent, ` +
          `n'hésitez pas à me recontacter.`
        )
      }
      break

    default:
      lines.push(`Je reviens vers vous concernant ${context}.`)
      lines.push('')
      lines.push(`N'hésitez pas à me contacter si vous avez des questions.`)
  }

  // Signature
  lines.push('')
  lines.push('Bien cordialement')

  return lines.join('\n')
}

function buildWhatsApp(p) {
  const prenom = getPrenom(p.nom)
  const context = getTypeDossierContext(p)
  const intensity = getRelanceIntensity(p)
  const daysSince = getDaysSinceLastInteraction(p)

  switch (p.statut) {
    case 'lead_simulateur': {
      const simuDataWA = parseSourceDetail(p)
      const typeUserWA = (simuDataWA.Type || '').toLowerCase()
      const isInvestWA = typeUserWA === 'investisseur'
      const isECWA = typeUserWA === 'expert-comptable' || typeUserWA === 'expert comptable'
      const isInterWA = typeUserWA === 'agent immobilier' || typeUserWA === 'avocat' || typeUserWA === 'conseiller'
      const cuisineWA = p.type_cuisine ? getCuisineLabel(p.type_cuisine) : null

      if (intensity === 'first') {
        if (isECWA) {
          return (
            `Bonjour ${prenom}, une simulation de valorisation a été réalisée via notre outil` +
            (p.simulateur_estimation ? ` (~${formatAmount(p.simulateur_estimation)})` : '') +
            `. Je suis Louis Pinet, avocat spécialisé en cession de restos. ` +
            `Je travaille régulièrement avec des EC sur ces dossiers (bail, valorisation, acte de cession). ` +
            `Si votre client a un projet, je peux faire un point rapide de 10 min avec vous. Sans engagement.`
          )
        }
        if (isInterWA) {
          return (
            `Bonjour ${prenom}, une simulation de valorisation a été réalisée via notre outil` +
            (p.simulateur_estimation ? ` (~${formatAmount(p.simulateur_estimation)})` : '') +
            `. Je suis Louis Pinet, avocat spécialisé en cession de fonds en restauration. ` +
            `Si votre client a un projet de cession ou d'acquisition, je peux vous faire un point ` +
            `de 10 min sur les aspects juridiques du dossier. Sans engagement.`
          )
        }
        if (isInvestWA) {
          return (
            `Bonjour ${prenom}, j'ai vu votre estimation de valorisation` +
            (cuisineWA ? ` sur un fonds en ${cuisineWA}` : '') +
            (p.simulateur_estimation ? ` (~${formatAmount(p.simulateur_estimation)})` : '') +
            `. Je suis Louis Pinet, avocat spécialisé en cession de restos. ` +
            `Si vous étudiez cette opportunité, je peux vous donner en 10 min les points de vigilance ` +
            `juridiques (bail, conformités, clauses). Gratuit et sans engagement.`
          )
        }
        // Restaurateur par défaut
        if (p.simulateur_estimation && cuisineWA) {
          return (
            `Bonjour ${prenom}, j'ai vu votre estimation de valorisation pour votre ${cuisineWA}` +
            ` (~${formatAmount(p.simulateur_estimation)}). ` +
            `Je suis Louis Pinet, avocat spécialisé en cession de restos. ` +
            `Si vous voulez, je peux vous faire un retour rapide sur votre estimation — ` +
            `ce qui joue en votre faveur et les points à vérifier avant de vous lancer. ` +
            `Gratuit et sans engagement, l'idée c'est juste de vous donner de la visibilité.`
          )
        }
        return (
          `Bonjour ${prenom}, j'ai vu que vous aviez fait une estimation de valorisation` +
          (p.simulateur_estimation ? ` (~${formatAmount(p.simulateur_estimation)})` : '') +
          `. Je suis Louis Pinet, avocat spécialisé en cession de fonds de commerce en restauration. ` +
          `Si ça vous intéresse, je peux vous faire un retour gratuit de 10 min sur votre estimation ` +
          `et les 2-3 points juridiques à anticiper. Sans engagement.`
        )
      }

      if (intensity === 'early') {
        if (isECWA || isInterWA) {
          return (
            `Bonjour ${prenom}, je vous avais contacté suite à une simulation de valorisation. ` +
            `Le dossier de votre client est-il toujours d'actualité ? ` +
            `Je reste disponible pour un point rapide sur les aspects juridiques. Sans engagement.`
          )
        }
        return (
          `Bonjour ${prenom}, je vous avais contacté suite à votre estimation de valorisation. ` +
          `Un point rapide qui peut être utile : le bail commercial contient souvent des clauses ` +
          `qui impactent directement le prix de ${isInvestWA ? 'l\'acquisition' : 'vente'}. ` +
          `Si vous voulez, je peux regarder ça avec vous en 10 min. Sans engagement.`
        )
      }

      if (isECWA || isInterWA) {
        return (
          `Bonjour ${prenom}, je vous avais contacté suite à une simulation de valorisation. ` +
          `Si ce dossier ou un autre se présente, n'hésitez pas à me joindre. Bonne continuation.`
        )
      }
      return (
        `Bonjour ${prenom}, je vous avais contacté suite à votre simulation de valorisation. ` +
        `Si le sujet redevient d'actualité, n'hésitez pas à me joindre — ` +
        `je pourrai vous faire un point rapide sur votre situation. Bonne continuation.`
      )
    }

    case 'prospect_identifie':
      if (p.simulateur_valorisation) {
        return (
          `Bonjour ${prenom}, je suis l'avocat spécialisé en restauration qui accompagne les restaurateurs dans leurs projets. ` +
          `J'ai bien reçu les résultats de votre simulation de valorisation. ` +
          `Seriez-vous disponible pour un court échange téléphonique ? Cela me permettrait de mieux comprendre votre projet et de vous donner un premier éclairage, sans engagement.`
        )
      }
      return (
        `Bonjour ${prenom}, je suis avocat spécialisé dans l'accompagnement des restaurateurs. ` +
        `Je me permets de vous contacter au sujet de ${context}. ` +
        `Seriez-vous disponible pour un court échange ? C'est sans engagement, l'idée est simplement de comprendre votre situation.`
      )

    case 'premier_contact':
      if (intensity === 'first') {
        return (
          `Bonjour ${prenom}, je reviens vers vous suite à notre échange. ` +
          `Avez-vous eu le temps de réfléchir aux points que nous avions abordés ? ` +
          `Je reste disponible si vous avez des questions.`
        )
      }
      if (daysSince && daysSince > 21) {
        return (
          `Bonjour ${prenom}, je prends de vos nouvelles. ` +
          `Votre projet de ${context} est-il toujours d'actualité ? ` +
          `N'hésitez pas à revenir vers moi quand vous le souhaitez.`
        )
      }
      return (
        `Bonjour ${prenom}, je me permets de revenir vers vous concernant ${context}. ` +
        `Des questions depuis notre dernier échange ? Je suis disponible.`
      )

    case 'diagnostic_rdv':
      return (
        `Bonjour ${prenom}, suite à notre rendez-vous, je souhaitais savoir si vous aviez pu réfléchir à la suite. ` +
        `N'hésitez pas si vous avez des questions — je suis disponible pour en discuter.`
      )

    case 'relance_en_attente':
      if (intensity === 'late') {
        return (
          `Bonjour ${prenom}, un petit message pour vous dire que je reste à votre disposition ` +
          `concernant ${context}. N'hésitez pas à me recontacter quand vous le souhaitez.`
        )
      }
      return (
        `Bonjour ${prenom}, je me permets de vous relancer concernant ${context}. ` +
        `Avez-vous pu avancer de votre côté ? Je suis disponible pour un point rapide si besoin.`
      )

    case 'deal_maturation':
      return (
        `Bonjour ${prenom}, je fais un point rapide sur ${context}. ` +
        `Y a-t-il eu du nouveau de votre côté ? Je reste disponible dès que vous souhaitez avancer.`
      )

    case 'lettre_mission_envoyee':
      return (
        `Bonjour ${prenom}, avez-vous pu consulter la lettre de mission ? ` +
        `N'hésitez pas si vous souhaitez que l'on en discute ou si certains points méritent des ajustements.`
      )

    case 'negociation':
      return (
        `Bonjour ${prenom}, je reviens vers vous suite à nos derniers échanges. ` +
        `Avez-vous pu réfléchir aux points évoqués ? Je suis disponible pour en discuter.`
      )

    case 'prescripteur':
      return (
        `Bonjour ${prenom}, je prends de vos nouvelles ! ` +
        `Avez-vous parmi vos clients des restaurateurs avec un projet de cession ou un sujet juridique ? ` +
        `Je suis disponible pour échanger avec eux.`
      )

    case 'suivi_long_terme':
      return (
        `Bonjour ${prenom}, je prends de vos nouvelles. Où en est votre projet ? ` +
        `Si votre situation a évolué ou si de nouvelles questions se posent, je reste disponible.`
      )

    default:
      return (
        `Bonjour ${prenom}, je reviens vers vous concernant ${context}. ` +
        `N'hésitez pas à me contacter si vous avez des questions.`
      )
  }
}

function formatAmount(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// --- API publique ---

/**
 * Génère les templates de relance pour un prospect donné.
 * Retourne { email: { subject, body }, whatsapp } ou null si pas de template.
 */
export function generateRelanceTemplates(prospect) {
  if (!prospect) return null

  // Statuts qui n'ont pas besoin de relance
  const noRelance = ['mission_en_cours', 'facture', 'cloture', 'perdu_refuse']
  if (noRelance.includes(prospect.statut)) return null

  return {
    email: {
      subject: buildSubject(prospect),
      body: buildEmailBody(prospect),
    },
    whatsapp: buildWhatsApp(prospect),
  }
}
