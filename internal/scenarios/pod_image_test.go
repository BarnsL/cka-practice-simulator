package scenarios_test

import (
	"context"
	"testing"

	"github.com/BarnsL/cka-practice-simulator/internal/scenarios"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func podFixture(namespace, name, image string, phase corev1.PodPhase) *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{Name: "app", Image: image},
			},
		},
		Status: corev1.PodStatus{Phase: phase},
	}
}

func TestPodImageScenario_Pass(t *testing.T) {
	client := fake.NewSimpleClientset(
		podFixture("default", "nginx-pod", "nginx:1.25", corev1.PodRunning),
	)
	s := scenarios.NewPodImageScenario("default", "nginx-pod", "nginx:1.25")
	ok, msg, err := s.Run(context.Background(), client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok {
		t.Errorf("expected pass, got: %s", msg)
	}
}

func TestPodImageScenario_WrongImage(t *testing.T) {
	client := fake.NewSimpleClientset(
		podFixture("default", "nginx-pod", "nginx:broken", corev1.PodRunning),
	)
	s := scenarios.NewPodImageScenario("default", "nginx-pod", "nginx:1.25")
	ok, msg, err := s.Run(context.Background(), client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ok {
		t.Error("expected fail for wrong image, got pass")
	}
	t.Logf("message: %s", msg)
}

func TestPodImageScenario_NotRunning(t *testing.T) {
	client := fake.NewSimpleClientset(
		podFixture("default", "nginx-pod", "nginx:1.25", corev1.PodPending),
	)
	s := scenarios.NewPodImageScenario("default", "nginx-pod", "nginx:1.25")
	ok, msg, err := s.Run(context.Background(), client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ok {
		t.Error("expected fail for non-Running pod, got pass")
	}
	t.Logf("message: %s", msg)
}

func TestPodImageScenario_PodNotFound(t *testing.T) {
	client := fake.NewSimpleClientset()
	s := scenarios.NewPodImageScenario("default", "missing-pod", "nginx:1.25")
	ok, _, err := s.Run(context.Background(), client)
	if err == nil {
		t.Error("expected error for missing pod, got nil")
	}
	if ok {
		t.Error("expected fail for missing pod, got pass")
	}
}
