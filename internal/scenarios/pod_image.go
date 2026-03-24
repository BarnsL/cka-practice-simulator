// Package scenarios contains CKA practice scenario definitions.
// Each scenario implements the Scenario interface so the grader can run
// any check uniformly without knowing its internals.
package scenarios

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// Scenario is the contract every practice check must satisfy.
type Scenario interface {
	Name() string
	// Run executes the check against a live (or fake) Kubernetes client.
	// It returns (passed, message, error).
	Run(ctx context.Context, client kubernetes.Interface) (bool, string, error)
}

// PodImageScenario checks that a specific pod is Running and uses the
// expected container image. This mirrors a common CKA task where a pod
// has been misconfigured with a wrong image and the candidate must fix it.
type PodImageScenario struct {
	namespace     string
	podName       string
	expectedImage string
}

// NewPodImageScenario constructs a PodImageScenario.
func NewPodImageScenario(namespace, podName, expectedImage string) *PodImageScenario {
	return &PodImageScenario{
		namespace:     namespace,
		podName:       podName,
		expectedImage: expectedImage,
	}
}

func (s *PodImageScenario) Name() string {
	return fmt.Sprintf("pod-image-check/%s/%s", s.namespace, s.podName)
}

// Run fetches the pod and validates two conditions:
//  1. Phase == Running — the pod scheduler has bound and started the pod.
//  2. The first container's image matches expectedImage exactly.
//
// We check only the first container because the scenario is intentionally
// minimal; extend this for multi-container pods as needed.
func (s *PodImageScenario) Run(ctx context.Context, client kubernetes.Interface) (bool, string, error) {
	// The grader always performs a fresh GET for the target pod instead of
	// relying on any previously captured scenario state. That keeps the check
	// aligned with the live cluster object that the candidate actually repaired.
	pod, err := client.CoreV1().Pods(s.namespace).Get(ctx, s.podName, metav1.GetOptions{})
	if err != nil {
		return false, fmt.Sprintf("could not fetch pod %s/%s: %v", s.namespace, s.podName, err), err
	}

	if pod.Status.Phase != corev1.PodRunning {
		return false, fmt.Sprintf("pod %s/%s is %s, want Running", s.namespace, s.podName, pod.Status.Phase), nil
	}

	if len(pod.Spec.Containers) == 0 {
		return false, "pod has no containers", nil
	}

	actual := pod.Spec.Containers[0].Image
	if actual != s.expectedImage {
		return false,
			fmt.Sprintf("container image is %q, want %q", actual, s.expectedImage),
			nil
	}

	return true, fmt.Sprintf("pod %s/%s is Running with image %q ✓", s.namespace, s.podName, actual), nil
}
