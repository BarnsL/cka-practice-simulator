// Package selftest provides a no-cluster execution path for validating core
// simulator behavior end-to-end with the Kubernetes fake client.
package selftest

import (
	"context"
	"fmt"

	"github.com/BarnsL/cka-practice-simulator/internal/grader"
	"github.com/BarnsL/cka-practice-simulator/internal/injector"
	"github.com/BarnsL/cka-practice-simulator/internal/scenarios"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

// Report captures the state transitions for the built-in local test flow.
type Report struct {
	ScenarioName  string
	InjectAction  string
	InjectMessage string
	BeforeRepair  grader.GradeResult
	AfterRepair   grader.GradeResult
}

// RunPodImageFlow demonstrates the intended simulator loop:
// inject a broken state, observe that grading fails, repair the state, and
// then confirm the grader passes. Using fake.NewSimpleClientset keeps this
// path runnable on any workstation without a live cluster.
func RunPodImageFlow(ctx context.Context) (Report, error) {
	const (
		namespace     = "default"
		podName       = "demo-pod"
		container     = "app"
		brokenImage   = "nginx:no-such-tag"
		expectedImage = "nginx:1.25"
	)

	client := fake.NewSimpleClientset()
	inj := injector.NewPodImageInjector(namespace, podName, container, brokenImage)
	gradeScenario := scenarios.NewPodImageScenario(namespace, podName, expectedImage)
	g := grader.New(client)

	injectResult, err := inj.Inject(ctx, client)
	if err != nil {
		return Report{}, fmt.Errorf("inject broken pod: %w", err)
	}

	injectedPod, err := client.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return Report{}, fmt.Errorf("read injected pod before grading: %w", err)
	}

	// A real cluster would usually surface a non-running phase while the bad
	// image fails to start. The fake client does not simulate that lifecycle,
	// so the self-test sets Pending explicitly to keep the local output legible.
	injectedPod.Status.Phase = corev1.PodPending
	if _, err := client.CoreV1().Pods(namespace).UpdateStatus(ctx, injectedPod, metav1.UpdateOptions{}); err != nil {
		return Report{}, fmt.Errorf("mark injected pod pending: %w", err)
	}

	beforeRepair := g.Grade(ctx, gradeScenario)

	pod, err := client.CoreV1().Pods(namespace).Get(ctx, podName, metav1.GetOptions{})
	if err != nil {
		return Report{}, fmt.Errorf("read injected pod: %w", err)
	}

	// The fake client does not run real schedulers or kubelets, so the self-test
	// performs the "candidate repair" explicitly by fixing both the image and the
	// observed phase that the grader checks.
	pod.Spec.Containers[0].Image = expectedImage
	pod.Status.Phase = corev1.PodRunning

	if _, err := client.CoreV1().Pods(namespace).Update(ctx, pod, metav1.UpdateOptions{}); err != nil {
		return Report{}, fmt.Errorf("repair pod spec: %w", err)
	}
	if _, err := client.CoreV1().Pods(namespace).UpdateStatus(ctx, pod, metav1.UpdateOptions{}); err != nil {
		return Report{}, fmt.Errorf("repair pod status: %w", err)
	}

	afterRepair := g.Grade(ctx, gradeScenario)

	return Report{
		ScenarioName:  gradeScenario.Name(),
		InjectAction:  injectResult.Action,
		InjectMessage: injectResult.Message,
		BeforeRepair:  beforeRepair,
		AfterRepair:   afterRepair,
	}, nil
}
