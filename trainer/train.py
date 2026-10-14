#!/usr/bin/env python3
"""Offline, reproducible softmax text-classifier training. Python standard library only.
This is a real local SGD trainer for a small ML baseline, not an LLM fine-tuner.
"""
import argparse, collections, hashlib, json, math, random, re, urllib.request
from pathlib import Path

def features(text, buckets=128):
    bag=collections.Counter()
    for word in re.findall(r"[a-z0-9']+", text.lower()):
        slot=int.from_bytes(hashlib.sha256(word.encode()).digest()[:4],'big') % buckets
        bag[slot]+=1
    return {index:value/sum(bag.values()) for index,value in bag.items()} if bag else {}

def probabilities(vector, weights, classes):
    logits=[sum(row[i]*val for i,val in vector.items()) for row in weights]
    baseline=max(logits); scaled=[math.exp(v-baseline) for v in logits]; denom=sum(scaled)
    return [v/denom for v in scaled]

def train(records, seed=42, epochs=40, learning_rate=.15, buckets=128):
    if len(records)<4: raise ValueError('At least four labeled records required')
    classes=sorted({r['label'] for r in records}); rng=random.Random(seed)
    if len(classes)<2: raise ValueError('At least two labels required')
    indices=list(range(len(records)));rng.shuffle(indices)
    # Stratify so tiny demo datasets have representation across both splits where possible.
    by_label={c:[] for c in classes}
    for index in indices:by_label[records[index]['label']].append(index)
    test_indices=[]
    for group in by_label.values():
        if len(group)>1:test_indices.extend(group[:max(1,round(len(group)*.2))])
    train_indices=[i for i in indices if i not in set(test_indices)]
    if not train_indices or not test_indices:raise ValueError('Supply at least two examples per class')
    weights=[[0.0]*buckets for _ in classes];history=[]
    for epoch in range(epochs):
        rng.shuffle(train_indices);loss=0
        for index in train_indices:
            row=records[index];x=features(row['text'],buckets);probs=probabilities(x,weights,classes);gold=classes.index(row['label']);loss-=math.log(max(probs[gold],1e-12))
            for k in range(len(classes)):
                error=probs[k]-(1 if k==gold else 0)
                for feature,value in x.items():weights[k][feature]-=learning_rate*error*value
        history.append({'epoch':epoch+1,'train_loss':round(loss/len(train_indices),6)})
    predictions=[]
    for i in test_indices:
        prob=probabilities(features(records[i]['text'],buckets),weights,classes)
        predictions.append((records[i]['label'],classes[prob.index(max(prob))]))
    correct=sum(gold==pred for gold,pred in predictions);acc=correct/len(predictions)
    f1_precision=[];f1_recall=[]
    for label in classes:
        tp=sum(g==label and p==label for g,p in predictions)
        fp=sum(g!=label and p==label for g,p in predictions)
        fn=sum(g==label and p!=label for g,p in predictions)
        f1_precision.append(tp/(tp+fp) if tp+fp else 0.0)
        f1_recall.append(tp/(tp+fn) if tp+fn else 0.0)
    return {'seed':seed,'accuracy':round(acc,5),'precision':round(sum(f1_precision)/len(classes),5),'recall':round(sum(f1_recall)/len(classes),5),'history':history,'weights':{'classes':classes,'buckets':buckets,'weights':[[round(v,5) for v in row] for row in weights]},'notes':f'Hashed softmax SGD; train={len(train_indices)}, held-out={len(test_indices)}, epochs={epochs}. Synthetic small datasets are illustrative, not reliable generalization benchmarks.'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--input',required=True,help='Exported experiment JSON from /api/experiments/:id/export');p.add_argument('--output',default='training-result.json');p.add_argument('--seed',type=int,default=42);p.add_argument('--epochs',type=int,default=40);p.add_argument('--lr',type=float,default=.15);p.add_argument('--buckets',type=int,default=128);p.add_argument('--upload',help='Base URL of running Worker, e.g. http://localhost:8787');p.add_argument('--token',default='',help='ADMIN_TOKEN for remote upload')
    a=p.parse_args();obj=json.loads(Path(a.input).read_text());result=train(obj['dataset']['records'],seed=a.seed,epochs=a.epochs,learning_rate=a.lr,buckets=a.buckets);Path(a.output).write_text(json.dumps(result,indent=2));print(f"Held-out accuracy: {result['accuracy']:.3f}; wrote {a.output}")
    if a.upload:
        path=f"{a.upload.rstrip('/')}/api/experiments/{obj['experiment']['id']}/runs";headers={'Content-Type':'application/json'}
        if a.token:headers['Authorization']='Bearer '+a.token
        req=urllib.request.Request(path,data=json.dumps(result).encode(),headers=headers,method='POST')
        with urllib.request.urlopen(req,timeout=20) as response:print('Uploaded run:',response.read().decode())

if __name__=='__main__':main()
