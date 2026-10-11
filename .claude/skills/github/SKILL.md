---
name: github
description: Connexion et travail avec GitHub pour l'utilisateur (compte DimKlen) via le CLI gh — vérifier/réparer l'authentification, cloner ou synchroniser un dépôt (notamment Zabava, https://github.com/DimKlen/Zabava), créer une branche, committer, pousser, ouvrir une PR, consulter issues et GitHub Actions. Utilise ce skill dès que l'utilisateur parle de GitHub, de dépôt/repo, de Zabava, de push, pull, clone, PR, pull request, issue, CI, ou demande « es-tu connecté à GitHub », même s'il ne nomme pas gh.
---

# GitHub (compte DimKlen)

Environnement : Windows, PowerShell 5.1 (pas de `&&` — utiliser `; if ($?) { ... }`), CLI `gh` installé, jeton stocké dans le trousseau Windows avec les scopes `repo`, `workflow`, `read:org`, `gist`.

## Dépôts connus

| Projet | URL | Visibilité | Branche principale | Copie locale |
|---|---|---|---|---|
| Zabava | https://github.com/DimKlen/Zabava | privé | `main` | `C:\Users\Sekoya\Projects\Zabava` |

Si l'utilisateur mentionne un autre dépôt, liste ses dépôts avec `gh repo list DimKlen --limit 50` plutôt que de deviner l'URL. Quand un nouveau dépôt est cloné, ajoute une ligne à ce tableau pour que la prochaine session le retrouve.

## 1. Vérifier la connexion (toujours en premier)

```powershell
gh auth status
```

- `✓ Logged in to github.com account DimKlen` → connecté, continuer.
- Non connecté ou jeton expiré → la session est non interactive, donc ne lance pas `gh auth login` toi-même (il attend un navigateur et bloquerait). Demande à l'utilisateur de taper dans son terminal :
  `! gh auth login --hostname github.com --git-protocol https --web`
  puis `! gh auth setup-git` pour que `git push` réutilise le jeton de gh.
- Si `git push` échoue avec une erreur d'authentification alors que `gh auth status` est OK, c'est presque toujours que git n'utilise pas gh comme helper : lance `gh auth setup-git`.

## 2. Récupérer le dépôt

```powershell
$dir = "C:\Users\Sekoya\Projects\Zabava"
if (Test-Path "$dir\.git") { git -C $dir fetch --all --prune; git -C $dir status -sb }
else { New-Item -ItemType Directory -Force C:\Users\Sekoya\Projects | Out-Null; gh repo clone DimKlen/Zabava $dir }
```

Avant un `pull`, regarde `git status` : s'il y a des modifications locales non commitées, signale-les plutôt que de les écraser.

## 3. Identité git

L'identité git globale est `DimKlen` / `klenkovic.dimitri@gmail.com` (choix de l'utilisateur). Si `git config --global user.name` renvoie autre chose, signale-le avant de committer.

## 4. Flux de travail standard

1. Partir de `main` à jour : `git switch main; git pull --ff-only`.
2. Créer une branche nommée d'après la tâche : `git switch -c feat/<sujet>` (ou `fix/`, `chore/`).
3. Committer seulement quand l'utilisateur le demande, avec un message clair (convention `feat:`, `fix:`, …). Utilise un here-string pour les messages multilignes :
   ```powershell
   git commit -m @'
   feat: titre court

   Détail éventuel.
   '@
   ```
4. Pousser : `git push -u origin HEAD`.
5. PR : `gh pr create --base main --fill` ou avec `--title`/`--body`.

Ne pousse jamais directement sur `main` et n'utilise pas `--force` sans accord explicite : le dépôt est la seule copie de référence du projet.

## 5. Commandes utiles

- PR ouvertes : `gh pr list -R DimKlen/Zabava`
- Voir une PR : `gh pr view <n> --comments`
- Issues : `gh issue list -R DimKlen/Zabava`, `gh issue create`
- CI : `gh run list -R DimKlen/Zabava --limit 5`, `gh run view <id> --log-failed`
- Lire un fichier sans cloner : `gh api repos/DimKlen/Zabava/contents/<chemin> --jq .content` (contenu en base64)
