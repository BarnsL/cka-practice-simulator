package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"github.com/BarnsL/cka-practice-simulator/internal/grader"
	"github.com/BarnsL/cka-practice-simulator/internal/scenarios"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

func main() {
	var kubeconfig string
	if home := homedir.HomeDir(); home != "" {
		flag.StringVar(&kubeconfig, "kubeconfig", filepath.Join(home, ".kube", "config"), "path to kubeconfig file")
	} else {
		flag.StringVar(&kubeconfig, "kubeconfig", "", "path to kubeconfig file")
	}

	namespace := flag.String("namespace", "default", "namespace of the target pod")
	pod := flag.String("pod", "", "name of the target pod (required)")
	image := flag.String("image", "", "expected container image (required)")
	flag.Parse()

	if *pod == "" || *image == "" {
		fmt.Fprintln(os.Stderr, "error: --pod and --image are required")
		flag.Usage()
		os.Exit(1)
	}

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
