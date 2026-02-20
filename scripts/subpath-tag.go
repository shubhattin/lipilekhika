package main

import (
	"bytes"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

type semver struct {
	major int
	minor int
	patch int
}

var semverSuffixRE = regexp.MustCompile(`^v(\d+)\.(\d+)\.(\d+)$`)

func main() {
	if len(os.Args) < 2 {
		printTopLevelUsage()
		os.Exit(2)
	}

	switch os.Args[1] {
	case "show":
		if err := runShow(os.Args[2:]); err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
	case "set":
		if err := runSet(os.Args[2:]); err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
	case "-h", "--help", "help":
		printTopLevelUsage()
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n", os.Args[1])
		printTopLevelUsage()
		os.Exit(2)
	}
}

func printTopLevelUsage() {
	fmt.Print(`subpath-tag: show/set git tags for monorepo subpaths

Usage:
  go run scripts/subpath-tag.go show --subpath packages/go/lipilekhika
  go run scripts/subpath-tag.go set --subpath packages/go/lipilekhika --bump patch --push
  go run scripts/subpath-tag.go set --subpath packages/go/lipilekhika --version v0.2.0 --push

Commands:
  show   print latest subpath tag and suggested next patch
  set    create a new subpath tag (and optionally push)
`)
}

func runShow(args []string) error {
	fs := flag.NewFlagSet("show", flag.ContinueOnError)
	subpath := fs.String("subpath", "", "module/subpath prefix (e.g. packages/go/lipilekhika)")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *subpath == "" {
		return errors.New("missing --subpath")
	}

	latest, latestVer, err := latestTag(*subpath)
	if err != nil {
		return err
	}

	fmt.Printf("subpath: %s\n", *subpath)
	if latest == "" {
		fmt.Println("latest: (none)")
		fmt.Printf("suggested: %s/v0.1.0\n", cleanSubpath(*subpath))
		return nil
	}
	fmt.Printf("latest: %s\n", latest)
	next := semver{major: latestVer.major, minor: latestVer.minor, patch: latestVer.patch + 1}
	fmt.Printf("suggested patch: %s/%s\n", cleanSubpath(*subpath), formatSemver(next))
	return nil
}

func runSet(args []string) error {
	fs := flag.NewFlagSet("set", flag.ContinueOnError)
	subpath := fs.String("subpath", "", "module/subpath prefix (e.g. packages/go/lipilekhika)")
	version := fs.String("version", "", "explicit version (e.g. v0.1.0)")
	bump := fs.String("bump", "patch", "version bump: patch|minor|major (ignored when --version is set)")
	push := fs.Bool("push", false, "push created tag to origin")
	annotated := fs.Bool("annotated", true, "create annotated tag")
	message := fs.String("message", "", "tag message (annotated tag only)")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *subpath == "" {
		return errors.New("missing --subpath")
	}

	var targetVersion semver
	if *version != "" {
		v, err := parseSemver(*version)
		if err != nil {
			return fmt.Errorf("invalid --version: %w", err)
		}
		targetVersion = v
	} else {
		_, latestVer, err := latestTag(*subpath)
		if err != nil {
			return err
		}
		targetVersion = bumpVersion(latestVer, *bump)
	}

	tag := fmt.Sprintf("%s/%s", cleanSubpath(*subpath), formatSemver(targetVersion))
	exists, err := tagExists(tag)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("tag already exists: %s", tag)
	}

	if *annotated {
		msg := *message
		if msg == "" {
			msg = tag
		}
		if _, err := runGit("tag", "-a", tag, "-m", msg); err != nil {
			return err
		}
	} else {
		if _, err := runGit("tag", tag); err != nil {
			return err
		}
	}

	fmt.Printf("created tag: %s\n", tag)
	if *push {
		if _, err := runGit("push", "origin", tag); err != nil {
			return err
		}
		fmt.Printf("pushed tag: %s\n", tag)
	} else {
		fmt.Printf("not pushed. run: git push origin %s\n", tag)
	}
	return nil
}

func latestTag(subpath string) (string, semver, error) {
	prefix := cleanSubpath(subpath)
	ref := fmt.Sprintf("refs/tags/%s/v*", prefix)
	out, err := runGit("for-each-ref", "--sort=-v:refname", "--format=%(refname:short)", ref)
	if err != nil {
		return "", semver{}, err
	}
	lines := splitNonEmptyLines(out)
	if len(lines) == 0 {
		return "", semver{}, nil
	}
	tag := strings.TrimSpace(lines[0])
	suffix := strings.TrimPrefix(tag, prefix+"/")
	v, err := parseSemver(suffix)
	if err != nil {
		return "", semver{}, fmt.Errorf("latest tag %q does not match vX.Y.Z: %w", tag, err)
	}
	return tag, v, nil
}

func bumpVersion(current semver, bump string) semver {
	switch bump {
	case "major":
		return semver{major: current.major + 1, minor: 0, patch: 0}
	case "minor":
		return semver{major: current.major, minor: current.minor + 1, patch: 0}
	case "patch":
		return semver{major: current.major, minor: current.minor, patch: current.patch + 1}
	default:
		// Safe default
		return semver{major: current.major, minor: current.minor, patch: current.patch + 1}
	}
}

func parseSemver(s string) (semver, error) {
	m := semverSuffixRE.FindStringSubmatch(strings.TrimSpace(s))
	if m == nil {
		return semver{}, fmt.Errorf("want vX.Y.Z, got %q", s)
	}
	maj, _ := strconv.Atoi(m[1])
	min, _ := strconv.Atoi(m[2])
	pat, _ := strconv.Atoi(m[3])
	return semver{major: maj, minor: min, patch: pat}, nil
}

func formatSemver(v semver) string {
	return fmt.Sprintf("v%d.%d.%d", v.major, v.minor, v.patch)
}

func cleanSubpath(s string) string {
	return strings.Trim(strings.TrimSpace(s), "/")
}

func splitNonEmptyLines(s string) []string {
	raw := strings.Split(s, "\n")
	out := make([]string, 0, len(raw))
	for _, line := range raw {
		line = strings.TrimSpace(line)
		if line != "" {
			out = append(out, line)
		}
	}
	return out
}

func tagExists(tag string) (bool, error) {
	out, err := runGit("tag", "--list", tag)
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(out) == tag, nil
}

func runGit(args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", fmt.Errorf("git %s failed: %s", strings.Join(args, " "), msg)
	}
	return stdout.String(), nil
}
