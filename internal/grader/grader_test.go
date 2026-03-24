package grader_test

import (
	"context"
	"testing"

	"github.com/BarnsL/cka-practice-simulator/internal/grader"
	"github.com/BarnsL/cka-practice-simulator/internal/scenarios"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func runningPod(namespace, name, image string) *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Spec:       corev1.PodSpec{Containers: []corev1.Container{{Name: "app", Image: image}}},
		Status:     corev1.PodStatus{Phase: corev1.PodRunning},
	}
}

func TestGrader_Pass(t *testing.T) {
	client := fake.NewSimpleClientset(runningPod("default", "mypod", "nginx:1.25"))
	g := grader.New(client)
	s := scenarios.NewPodImageScenario("default", "mypod", "nginx:1.25")
	result := g.Grade(context.Background(), s)
	if result.Score != 1 {
		t.Errorf("expected score 1, got %d: %s", result.Score, result.Message)
	}
	if result.Status != "PASS" {
		t.Errorf("expected PASS, got %s", result.Status)
	}
}

func TestGrader_Fail(t *testing.T) {
	client := fake.NewSimpleClientset(runningPod("default", "mypod", "nginx:broken"))
	g := grader.New(client)
	s := scenarios.NewPodImageScenario("default", "mypod", "nginx:1.25")
	result := g.Grade(context.Background(), s)
	if result.Score != 0 {
		t.Errorf("expected score 0, got %d", result.Score)
	}
	if result.Status != "FAIL" {
		t.Errorf("expected FAIL, got %s", result.Status)
	}
}

func TestGrader_Error(t *testing.T) {
	client := fake.NewSimpleClientset() // pod doesn't exist → error
	g := grader.New(client)
	s := scenarios.NewPodImageScenario("default", "mypod", "nginx:1.25")
	result := g.Grade(context.Background(), s)
	if result.Score != 0 {
		t.Errorf("expected score 0, got %d", result.Score)
	}
	if result.Status != "ERROR" {
		t.Errorf("expected ERROR, got %s", result.Status)
	}
}
