package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/BarnsL/cka-practice-simulator/internal/grader"
	"github.com/BarnsL/cka-practice-simulator/internal/injector"
	"github.com/BarnsL/cka-practice-simulator/internal/scenarios"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]
	if strings.HasPrefix(command, "-") {
		// Keep the original CLI behavior working by treating a flag-only
		// invocation as `grade`.
		runGrade(os.Args[1:])
		return
	}

	switch command {
	case "grade":
		runGrade(os.Args[2:])
	case "inject":
		runInject(os.Args[2:])
	default:
		fmt.Fprintf(os.Stderr, "error: unknown command %q\n\n", command)
		printUsage()
		os.Exit(1)
	}
}

func runGrade(args []string) {
	fs := flag.NewFlagSet("grade", flag.ExitOnError)
	kubeconfig := fs.String("kubeconfig", defaultKubeconfigPath(), "path to kubeconfig file")
	namespace := fs.String("namespace", "default", "namespace of the target pod")
	pod := fs.String("pod", "", "name of the target pod (required)")
	image := fs.String("image", "", "expected container image (required)")
	_ = fs.Parse(args)

	if *pod == "" || *image == "" {
		fmt.Fprintln(os.Stderr, "error: --pod and --image are required for grade")
		fs.Usage()
		os.Exit(1)
	}

	client := mustClient(*kubeconfig)
	scenario := scenarios.NewPodImageScenario(*namespace, *pod, *image)
	g := grader.New(client)
	result := g.Grade(context.Background(), scenario)

	fmt.Printf("Scenario : %s\n", result.ScenarioName)
	fmt.Printf("Status   : %s\n", result.Status)
	fmt.Printf("Score    : %d/1\n", result.Score)
	fmt.Printf("Message  : %s\n", result.Message)

	if result.Score == 0 {
		os.Exit(1)
	}
}

func runInject(args []string) {
	fs := flag.NewFlagSet("inject", flag.ExitOnError)
	kubeconfig := fs.String("kubeconfig", defaultKubeconfigPath(), "path to kubeconfig file")
	namespace := fs.String("namespace", "default", "namespace of the target pod")
	pod := fs.String("pod", "", "name of the target pod (required)")
	containerName := fs.String("container-name", "app", "name of the target container")
	brokenImage := fs.String("broken-image", "", "broken image to inject (required)")
	_ = fs.Parse(args)

	if *pod == "" || *brokenImage == "" {
		fmt.Fprintln(os.Stderr, "error: --pod and --broken-image are required for inject")
		fs.Usage()
		os.Exit(1)
	}

	client := mustClient(*kubeconfig)
	inj := injector.NewPodImageInjector(*namespace, *pod, *containerName, *brokenImage)
	result, err := inj.Inject(context.Background(), client)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error injecting scenario: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Scenario : %s\n", inj.Name())
	fmt.Printf("Action   : %s\n", result.Action)
	fmt.Printf("Message  : %s\n", result.Message)
}

func mustClient(kubeconfig string) kubernetes.Interface {
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error building kubeconfig: %v\n", err)
		os.Exit(1)
	}

	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error creating kubernetes client: %v\n", err)
		os.Exit(1)
	}

	return client
}

func defaultKubeconfigPath() string {
	if home := homedir.HomeDir(); home != "" {
		return filepath.Join(home, ".kube", "config")
	}
	return ""
}

func printUsage() {
	fmt.Fprintln(os.Stderr, "Usage:")
	fmt.Fprintln(os.Stderr, "  cka-sim grade --namespace default --pod nginx-pod --image nginx:1.25")
	fmt.Fprintln(os.Stderr, "  cka-sim inject --namespace default --pod nginx-pod --broken-image nginx:no-such-tag")
}
