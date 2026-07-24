

Project Vision

Rather than beginning as a full competitive programming platform, the project starts as a visual algorithm-building experience.

Users solve programming challenges by assembling reusable logic blocks into working algorithms. Every change they make is executed instantly within a live simulation, allowing them to see the direct consequences of their logic instead of reading console output or test results.

The focus is not on writing syntax—it is on learning and demonstrating computational thinking.

As users progress, they unlock increasingly advanced capabilities, eventually transitioning from visual logic blocks to real code, while interacting with the same simulation engine.

The long-term vision is for this engine to become the foundation for multiplayer competitions, technical interviews, education, and live programming events.

The Core Idea

This is not another visual programming tool like Scratch.

It is a visual algorithm engine where programming concepts are represented as modular "logic bricks."

Each brick performs a specific operation, such as:





Move Forward



Turn Left



Scan Area



Compare Values



Repeat



If Condition



Store Memory



Find Nearest Object



Calculate Distance

Users arrange these bricks to create an algorithm.

The engine executes the algorithm in real time inside a simulation, making every decision visible.

Instead of seeing code compile, users watch their robot, drone, or agent behave according to the logic they designed.

Why Start Here?

The solo experience validates the most important part of the platform:

Can people understand algorithms by watching them?

If the answer is yes, then everything else becomes an extension of the same engine.

The multiplayer platform, interview system, and educational tools all reuse the same foundation.

Evolution of the Platform

Phase 1 — Solo Challenge Mode

The user solves progressively harder algorithmic challenges.

Examples include:





Navigate a maze



Collect resources efficiently



Sort objects



Deliver packages



Escape obstacles



Build optimal routes

Every challenge has measurable objectives such as:





Fewest moves



Lowest energy consumption



Fastest completion



Best path efficiency

Phase 2 — Visual Programming

Instead of typing code, users build algorithms using logic components.

For example:



Start

↓

Scan

↓

If Wall

↓

Turn Right

↓

Else

↓

Move Forward

↓

Repeat

The simulation immediately reflects the result.

Phase 3 — Hybrid Programming

As users become more experienced, the platform gradually introduces code.

A logic block can be expanded into actual JavaScript or Python.

Eventually users replace entire blocks with handwritten code while the surrounding simulation remains exactly the same.

This creates a natural progression from beginner to professional programming.

Phase 4 — Multiplayer Competitions

Once the engine is mature, multiple players solve the same challenge simultaneously.

Each participant has their own workspace while the shared simulation updates in real time.

Spectators watch the consequences of each team's algorithms rather than the code itself.

Phase 5 — Professional Applications

The same engine can be adapted beyond competitions.

Technical Interviews

Candidates solve realistic algorithmic problems in a visual environment.

Interviewers evaluate:





 Problem-solving approach 



 Algorithm design 



 Efficiency 



 Decision-making 



 Ability to improve an existing solution 

Instead of reviewing whiteboard code, interviewers observe how the candidate's algorithm behaves.

Education

Students learn algorithms by experimentation rather than memorization.

Concepts such as:





 Loops 



 Conditions 



 State 



 Recursion 



 Search algorithms 



 Graph traversal 

become visible through interactive simulations.

Recruitment Competitions

Companies host branded challenges where candidates compete on realistic engineering problems.

Top performers can be invited directly into the hiring process based on demonstrated ability.

Live Esports

Developers compete in front of audiences while commentators explain how algorithmic improvements change the simulation.

The entertainment comes from watching intelligent systems evolve in real time.

The Long-Term Vision

The goal is not simply to create another coding platform.

The goal is to build a universal algorithm simulation engine.

One engine.

Multiple interfaces.





 A beginner assembles logic blocks. 



 A student learns algorithms visually. 



 A developer writes code. 



 A company runs technical interviews. 



 A university hosts programming competitions. 



 A tournament streams live algorithm battles to thousands of viewers. 

All of these experiences are powered by the same core idea:

Algorithms should be experienced, not just read.

I think this framing captures something broader than "visual programming." It positions the project as a platform for thinking computationally, where the interface—blocks, code, interviews, or competitions—is just one way of interacting with the same underlying engine. That's a vision that can scale naturally without changing the product's core identity.



Imagine the platform as a hierarchy of intelligence, similar to how humans make decisions. We don't consciously think about every movement we make. We have goals, strategies, habits, and reactions. Your programming model can mirror that.

At the highest level sits the State Machine. The state machine answers one question: "What am I trying to accomplish right now?" A robot cannot simultaneously be exploring, escaping danger, returning home, and collecting resources. It should always be in one primary state. Those states might be Exploring, Searching, Collecting, Returning, Avoiding Danger, or Finished. The state machine doesn't decide every move; it simply determines which mode of operation the robot is currently in.

Once a state has been selected, the Rule Builder takes over. Rules answer the question: "Given my current situation, what should I do next?" If the robot is exploring and detects a wall directly ahead, a rule might instruct it to turn left. If it notices the goal nearby, another rule might tell it to switch to a more direct path. Rules are reactive. They constantly observe the environment and make small decisions based on what is happening in the current moment.

The actions that those rules perform shouldn't be built from scratch every time. Instead, they should call reusable functions or strategy cards. These are the building blocks of intelligence. Rather than repeatedly assembling the same logic, users create reusable behaviors like Explore Unknown Area, Follow Wall, Find Shortest Route, Avoid Loops, Return to Start, or Collect Nearby Resources. Once created, these become tools that can be used across many challenges.

This creates a very natural hierarchy.

The state machine decides which overall strategy is active.

The rules decide when something should happen.

The functions decide how it actually happens.

That separation makes the system much easier to understand, debug, and extend.

As users become more experienced, another layer can emerge: Memory.

One of the biggest differences between a beginner algorithm and a sophisticated one is memory. Beginners react only to what they currently see. Advanced algorithms remember where they've already been, which paths failed, which locations contain resources, and which areas remain unexplored.

Instead of forcing users to build memory systems from scratch, the platform could expose memory as a first-class concept. Users could create named memories such as Visited Cells, Known Obstacles, Resource Locations, or Previous Decisions. Functions and rules could read from and write to these memories automatically. This introduces concepts like state persistence and data structures without overwhelming beginners with implementation details.

Another important layer is Goals.

Many programming environments jump directly into instructions. Humans rarely think that way. We usually begin with an objective.

Imagine each challenge starts by asking the user to define priorities instead of actions.

For example:





Reach the goal.



Avoid enemies.



Minimize energy consumption.



Collect as many resources as possible.

Those goals become inputs to the state machine. If the robot's battery becomes critically low, the active goal changes. The state machine transitions from Exploring to Returning to Recharge. None of the lower-level logic has to change because it simply reacts to the newly active state.

This makes the behavior feel intentional rather than scripted.

You could also introduce Capabilities as another reusable concept.

Instead of every robot having every possible action, users unlock or equip capabilities.

One robot might know how to scan.

Another might be able to build bridges.

Another might have long-range sensors.

This encourages strategic thinking because the intelligence must adapt to the tools available. It also opens the door for multiplayer modes where teams choose different capability loadouts before the challenge begins.

What excites me most is the possibility of treating functions as evolving assets rather than one-off solutions.

Suppose a player creates a particularly effective exploration algorithm. That shouldn't disappear when the level ends. It should become part of their personal library.

Over time, a player's library might contain dozens of reusable strategies:





Efficient Maze Explorer



Fast Route Planner



Dead-End Detector



Resource Optimizer



Safe Path Finder



Energy Saver

Every new challenge becomes less about starting from scratch and more about assembling, refining, and adapting an existing toolkit. This mirrors real software engineering, where developers build and reuse libraries instead of rewriting everything for each project.

I also think there's room for a concept I'd call Algorithm Composition.

Instead of asking players to build one massive intelligence, encourage them to compose several smaller intelligences.

For example, the robot's navigation system doesn't need to know anything about energy management. The navigation module focuses entirely on movement. A separate resource manager decides when it's worth collecting items. A third safety module watches for hazards. A coordinator combines their outputs to produce the final decision.

Without exposing users to the terminology, you're introducing them to software architecture concepts like separation of concerns, modularity, and composition.

If I were defining the platform's programming model, I'd describe it like this:

Every challenge presents an environment and a goal. Players don't write one long algorithm. Instead, they build an intelligent agent by combining several layers of reasoning. Goals determine priorities. State machines decide the agent's current mode of operation. Rules react to the environment. Reusable functions and strategy cards encapsulate common behaviors. Memory stores knowledge gained during execution. Capabilities define what actions the agent can perform. Together, these layers produce an adaptive algorithm that can solve not just one scenario, but an entire class of problems.



The first milestone is not about building a game that people can play. It is about proving that the foundation of your platform works. Before thinking about visual programming, multiplayer, interviews, or streaming, you need to answer one important question: Can I build an engine that continuously takes information from a world, asks an intelligent agent what it wants to do, executes that decision, and updates the world? If you can do that, then you've built the most important part of the platform.

At this stage, the maze is simply a testing environment. It is not the product itself. You could replace the maze later with a warehouse, a traffic network, a drone delivery system, or a factory simulation without changing how the engine works. The maze is chosen because it is easy to understand, easy to build, and contains enough complexity to test decision-making.

Imagine opening the application. There is a simple grid representing the maze. Some squares are empty, some are walls, one square is the starting point, and another is the goal. A small robot appears at the starting point. There are no menus, no drag-and-drop interface, and no code editor. There is simply a button to start the simulation.

When the simulation begins, the engine starts running in a continuous loop. Every fraction of a second, it asks the robot a question: "Given everything you currently know, what do you want to do next?" The robot responds with a single action such as moving forward, turning left, turning right, or waiting. The engine performs that action, updates the robot's position inside the maze, and immediately asks the same question again. This conversation between the engine and the robot continues until the robot reaches the goal or gets stuck.

One of the most important architectural decisions is that the robot should never have direct access to the maze. It should not know where every wall is or how the maze is stored. Instead, the engine should provide the robot with only the information it is allowed to know. This information is called an observation. An observation might tell the robot its current position, whether there is a wall directly ahead, whether the goal is visible, how much energy remains, or which nearby tiles it has already visited. The robot must make all of its decisions using only this observation.

At first, the robot does not need to be intelligent. In fact, it is better if it is not. Give it an extremely simple decision-making process, such as always moving forward unless there is a wall, in which case it turns right. This algorithm will often fail, wander around the maze, or get trapped in loops. That is perfectly acceptable because you are not testing the quality of the algorithm—you are testing whether the engine can repeatedly observe, decide, act, and update the world.

Once that basic loop works, you can begin replacing the robot's simple logic with the architecture you've been designing. Instead of making decisions directly, the robot's decision process becomes layered. First, the engine determines the robot's current goal. Then it checks which state is active. Next, it evaluates the rules that belong to that state. Those rules choose one or more reusable functions to execute, and those functions finally return the action that the robot should perform. From the outside, nothing changes. The robot still moves around the maze. Internally, however, the decision is now produced by a much more flexible and scalable architecture.

While all of this is happening, it would be useful to build a developer panel alongside the simulation. This panel is not intended for players; it is a debugging tool for you. As the robot moves, the panel could display its current goal, active state, triggered rule, executed function, chosen action, and memory contents. Watching these values change in real time will make it much easier to understand why the robot behaves the way it does and to diagnose problems as the engine becomes more complex.

The success criteria for this milestone are actually quite simple. If the engine can load a world, create an agent, repeatedly provide observations, receive decisions, execute actions, update the simulation, and visually show the results, then the core of your platform exists. Everything else—visual programming, handwritten code, multiplayer collaboration, technical interviews, education, and esports broadcasting—becomes another way of creating or presenting those decisions.

By the end of this milestone, you should not think of yourself as having built a maze game. You should think of yourself as having built a generic simulation engine that can power many different kinds of intelligent systems. The maze is simply the first environment that proves the engine works. Once that foundation is solid, expanding into more advanced challenges becomes a matter of creating new worlds and new decision models rather than rebuilding the engine itself.

The first milestone is building the core simulation engine, not building the full platform.

The objective is to prove that your engine can run an intelligent agent inside a world. Everything else—visual programming, multiplayer, competitions, interviews, and streaming—depends on this working correctly.

At the end of this milestone, there should be a simple environment (a maze) containing a single autonomous robot. The robot should be able to observe its surroundings, make a decision, perform an action, and repeat this process continuously until it reaches the goal or fails. The entire simulation should update in real time so you can watch the robot think and move.

This milestone is not about creating the smartest algorithm. It is not about building a polished game. It is not about creating the visual programming interface. It is simply about creating the engine that allows any intelligent agent to exist and interact with a simulated world.

More specifically, by the end of this milestone you should have:

A simulation engine that manages a world and updates it continuously.
A grid-based maze world that can be loaded and rendered.
A single agent (robot) that exists inside that world.
A simulation loop that repeatedly observes the world, asks the agent for a decision, executes that decision, and updates the world.
A basic decision architecture (it can even be hardcoded initially) that returns actions such as move forward, turn left, turn right, or wait.
A simple visualization so you can watch the robot move through the maze in real time.
A small debug panel that shows what the engine is doing internally, such as the current observation, chosen action, and simulation tick.

The maze is only being used because it is the simplest environment that contains all the elements your engine needs: a world, obstacles, objectives, movement, and decision-making. Once the engine works with a maze, you can replace the maze with almost anything—a warehouse, a traffic system, a drone delivery network, or a factory—without changing the core architecture.

So, if we were to write the first milestone as a project goal, it would be:

Build a reusable simulation engine capable of running a single autonomous agent inside a grid-based world, where the agent continuously observes its environment, makes decisions, performs actions, and updates the simulation in real time.

Milestone 1 — Core Simulation & Decision Engine
Overview

The objective of this milestone is not to build the final product. It is to build the engine that every future feature will rely on.

This milestone focuses on proving one idea:

An external set of instructions can control an autonomous agent inside a simulated world through a reusable decision engine.

There are no visual programming blocks, no multiplayer, no user accounts, and no interviews at this stage.

Instead, the focus is on creating a generic engine that can load a world, load an agent's "brain," execute its decisions continuously, and visually simulate the results.

If this milestone succeeds, every future feature—visual programming, handwritten code, multiplayer competitions, interview mode, AI-generated algorithms, and live broadcasting—will simply become new ways of creating instructions for the same engine.

Milestone Goal

Build a reusable simulation engine capable of running a single autonomous agent inside a grid-based environment using externally defined instructions.

The engine should repeatedly:

Observe the environment
Evaluate the agent's decision logic
Execute an action
Update the world
Render the changes
Repeat until completion

This loop becomes the foundation of the platform.

Objectives

By the end of this milestone, the project should demonstrate that:

A world can be loaded independently of the engine.
An agent can be loaded independently of the world.
The agent's behaviour can be defined using external instruction files.
The engine can interpret those instructions.
The simulation updates continuously in real time.
The architecture is generic enough to support different worlds in the future.
Scope

This milestone intentionally excludes:

Visual programming
Drag-and-drop editors
Multiplayer
Networking
Authentication
Database
Teams
Live streaming
Interviews
AI generation
Leaderboards

Everything should remain local and focused solely on validating the engine.

The Test Environment

A simple maze will act as the first simulation environment.

The maze is not the product.

It is simply the easiest environment for testing autonomous decision making.

The maze should consist of:

Empty tiles
Walls
Start position
Goal position

The engine should be able to load different maze layouts without modifying any code.

The Agent

The simulation contains one robot.

The robot represents an autonomous agent.

It should have basic information such as:

Position
Direction
Current state
Memory
Energy (optional)

The robot does not know how the maze works.

It only receives observations from the engine.

The Observation System

The engine is responsible for observing the world and providing relevant information to the agent.

An observation may include:

Current position
Wall ahead
Available neighbouring tiles
Goal visibility
Previously visited positions
Remaining energy

The observation acts as the communication layer between the simulation and the decision engine.

The agent never accesses the world directly.

The Decision Engine

The Decision Engine is the core of the project.

Every simulation tick follows the same process.

The engine generates an observation from the world.

That observation is passed to the decision engine.

The decision engine evaluates the agent's behaviour.

It returns exactly one action.

The simulation executes that action.

The world updates.

The process repeats continuously.

The engine should never know why a decision was made.

It only knows what action was returned.

Instruction Files

For this milestone, the agent's behaviour should be defined entirely through files rather than a visual interface.

These files represent the robot's "brain."

Possible project structure:

brain/
│
├── goals.json
├── states.json
├── rules.json
├── functions.json
└── memory.json

The engine loads these files when the simulation starts.

This proves that the robot's intelligence can exist independently of the engine.

In future milestones, visual editors, handwritten code, or AI-generated solutions will simply generate these same instruction files.

World Files

The world should also be data-driven.

Example:

world/
│
├── maze.json
├── tiles.json
└── entities.json

The simulation should never contain hardcoded mazes.

Changing the maze should require replacing a file, not modifying the engine.

Runtime Flow

When the simulation begins, the engine should perform the following sequence:

Load the world.
Load the agent.
Load the instruction files.
Place the agent inside the world.
Start the simulation loop.
Continuously observe, decide, execute, and update until completion.

This runtime loop should remain unchanged regardless of future game modes.

Simulation Loop

Every simulation tick should follow this lifecycle:

Read World

↓

Generate Observation

↓

Evaluate Goal

↓

Determine Active State

↓

Evaluate Rules

↓

Execute Function

↓

Return Action

↓

Update World

↓

Render Frame

↓

Repeat

This becomes the heartbeat of the engine.

Initial Behaviour

The first version does not need sophisticated intelligence.

A simple rule set is enough.

For example:

If there is no wall ahead, move forward.
If there is a wall ahead, turn right.

Even if the robot performs poorly, the milestone is successful if the engine correctly executes the instruction files and updates the simulation.

Rendering

Rendering exists purely for debugging and validation.

Simple coloured squares are sufficient.

The renderer should display:

Maze
Robot
Goal
Walls

The purpose is to visualize the decision engine rather than create polished graphics.

Debug Panel

Alongside the simulation, build a developer panel that exposes the engine's internal state.

It should display information such as:

Current simulation tick
Current observation
Active goal
Active state
Triggered rule
Executed function
Returned action
Memory contents

This panel will become invaluable as the platform grows and will later support debugging for competitions and interviews.

Engine Architecture

The project should be organized around systems rather than features.

A suggested structure:

engine/
│
├── simulation/
│   ├── world.ts
│   ├── grid.ts
│   ├── renderer.ts
│   └── gameLoop.ts
│
├── decision/
│   ├── observation.ts
│   ├── goalManager.ts
│   ├── stateMachine.ts
│   ├── ruleEngine.ts
│   ├── functionExecutor.ts
│   └── actionResolver.ts
│
├── runtime/
│   ├── loader.ts
│   └── sandbox.ts
│
brain/
│
├── goals.json
├── states.json
├── rules.json
├── functions.json
└── memory.json
│
world/
│
├── maze.json
└── entities.json

This keeps the engine completely independent of any future editor.

Success Criteria

The milestone is complete when the following can be demonstrated:

A maze is loaded from configuration.
A robot is placed into the maze.
The robot's behaviour is loaded from external instruction files.
The engine continuously generates observations.
The decision engine evaluates those instructions.
The robot performs actions in real time.
The world updates correctly after each action.
The entire process can be watched through a simple visual simulation.
Different mazes and different instruction files can be loaded without modifying the engine.
Why This Milestone Matters

This milestone validates the most important architectural decision in the project:

The engine executes intelligence—it does not create it.

By separating the simulation from the agent's decision-making, you create a platform where the same engine can later execute logic produced by a visual editor, handwritten code, AI-generated solutions, or collaborative teams. The simulation engine remains unchanged; only the source of the instructions evolves.

Completing this milestone means you've built the foundation for a platform that can eventually support education, technical interviews, multiplayer competitions, and live programming events, all powered by the same reusable execution engine.


For the first milestone, we are building the core simulation engine and instruction system that allows an autonomous agent to operate inside a virtual environment.

The goal is to create a simple working prototype where a robot exists inside a maze-like world and follows instructions that are stored in external files. The robot is not controlled manually. Instead, the engine reads its logic, interprets the instructions, and uses them to decide what the robot should do at every moment.

The first version of the environment will be a simple grid-based maze. The maze contains obstacles, open paths, a starting position, and a goal. The robot starts at the beginning of the maze and attempts to reach the goal. The purpose of the maze is not to create a game yet, but to create a controlled environment where we can test how well the engine can execute decision-making logic.

The robot's intelligence will be stored separately from the simulation itself. Instead of writing the robot behaviour directly inside the engine, we will create instruction files that describe how the robot should behave. These files will define things like the robot's goals, possible states, decision rules, and reusable actions.

For example, the robot may have a goal of reaching the exit. While trying to achieve that goal, it may enter different states such as exploring, avoiding obstacles, or moving toward the target. Each state will contain rules that determine what action should happen in different situations. A rule might say: "If there is a wall ahead, turn right" or "If the goal is visible, move toward it."

The engine will continuously read the current situation in the environment and provide the robot with information about what it can see. The robot does not directly understand the maze; it only receives observations such as its current position, nearby obstacles, and whether the goal is visible. Based on those observations, the instruction system determines the next action.

The basic cycle of the engine will work like this: the environment provides information about the current situation, the instruction system processes that information, the robot receives an action such as moving or turning, and the environment updates based on that action. This process repeats continuously, creating a live simulation of the robot following its programmed intelligence.

The first milestone is therefore about proving that we can create a system where a world, an agent, and an external instruction system can work together. The robot should be able to load its behaviour from files, make decisions, interact with the environment, and visibly complete tasks inside the simulation.

Once this foundation works, the same engine can later support more advanced features such as visual programming blocks, multiplayer competitions, coding challenges, company interviews, and different simulation environments. The first step is simply building the system that allows instructions to become visible actions inside a virtual world.