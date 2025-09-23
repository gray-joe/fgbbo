"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "../components/AppLayout";
import ErrorScreen from "../components/ErrorScreen";
import { useActiveParticipants } from "../../lib/hooks/useParticipants";
import { useWeeklyPredictions } from "../../lib/hooks/usePredictions";
import { useWeekLockStatus } from "../../lib/hooks/useWeekLocks";
import { useAuth } from "../../lib/hooks/useAuth";
import { useWeeklySummaries } from "../../lib/hooks/useResults";
import { WeeklyPrediction } from "../../lib/predictions";
import { getAllResults } from "../../lib/results";
import { getErrorConfig, determineErrorType } from "../../lib/errorUtils";

function PredictionsPageContent() {
	const { user, isAuthenticated, loading: authLoading } = useAuth();
	const { participants, loading: participantsLoading, error: participantsError } = useActiveParticipants();
	const { summaries, loading: summariesLoading } = useWeeklySummaries();
	const searchParams = useSearchParams();
	const [currentWeek, setCurrentWeek] = useState(0);
	const [isClient, setIsClient] = useState(false);
	const [eliminationData, setEliminationData] = useState<Map<string, number>>(new Map());
	const [predictions, setPredictions] = useState<WeeklyPrediction>({
		week: 0,
		star_baker: "",
		technical_winner: "",
		eliminated: "",
		handshake: "",
		weekly_special: "",
		winner: "",
		finalist1: "",
		finalist2: "",
		finalist3: "",
	});
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [pageError, setPageError] = useState<Error | null>(null);

	const { predictions: existingPredictions, loading: predictionsLoading, savePredictions } = useWeeklyPredictions(
		user?.id || null,
		currentWeek
	);

	const weekThemes: Record<number, { name: string; weeklySpecial: string }> = {
		0: {
			name: "Overall Predictions",
			weeklySpecial: "Who will be the overall winner and finalists?"
		},
		1: {
			name: "Cake",
			weeklySpecial: "Which Baker's Cake will have a Soggy Bottom?"
		},
		2: {
			name: "Biscuit",
			weeklySpecial: "Who will be the first baker to get a 'Good Snap'?"
		},
		3: {
			name: "Bread",
			weeklySpecial: "Which Baker will overwork their dough?"
		},
		4: {
			name: "Back to School",
			weeklySpecial: "Who will come last in the technical?"
		},
		5: {
			name: "TBD",
			weeklySpecial: "TBD"
		},
		6: {
			name: "TBD",
			weeklySpecial: "TBD"
		},
		7: {
			name: "TBD",
			weeklySpecial: "TBD"
		},
		8: {
			name: "TBD",
			weeklySpecial: "TBD"
		},
		9: {
			name: "TBD",
			weeklySpecial: "TBD"
		}
	}

	const getWeekTheme = (week: number) => {
		try {
			return weekThemes[week] || {
				name: `Week ${week}`,
				weeklySpecial: "Make your prediction for this week's special challenge!"
			}
		} catch (error) {
			console.error('Error getting week theme:', error);
			return {
				name: `Week ${week}`,
				weeklySpecial: "Make your prediction for this week's special challenge!"
			}
		}
	}
	const { isLocked, loading: lockLoading } = useWeekLockStatus(currentWeek);

	const getCurrentWeek = () => {
		if (!summaries.length) return 0;
		return Math.max(...summaries.map(s => s.week)) + 1;
	};

	// Ensure we're on the client side
	useEffect(() => {
		setIsClient(true);
	}, []);

	// Handle URL parameter for week (priority over calculated week)
	useEffect(() => {
		if (!isClient) return; // Don't process search params on server
		
		const weekParam = searchParams.get('week');
		if (weekParam !== null) {
			const weekNumber = parseInt(weekParam, 10);
			if (!isNaN(weekNumber) && weekNumber >= 0) {
				setCurrentWeek(weekNumber);
				return; // Don't calculate week if URL parameter is present
			}
		}
		
		// Only calculate week if no URL parameter or invalid parameter
		if (!summariesLoading && summaries.length > 0) {
			const calculatedCurrentWeek = getCurrentWeek();
			setCurrentWeek(calculatedCurrentWeek);
		}
	}, [summaries, summariesLoading, searchParams, isClient]);

	useEffect(() => {
		const loadEliminationData = async () => {
			try {
				const allResults = await getAllResults();
				const eliminationMap = new Map<string, number>();

				allResults.forEach(result => {
					if (result.eliminated) {
						eliminationMap.set(result.participant_id, result.week);
					}
				});

				setEliminationData(eliminationMap);
			} catch (error) {
				console.error('Error loading elimination data:', error);
			}
		};

		loadEliminationData();
	}, []);

	const getAvailableParticipants = () => {
		try {
			if (!participants) return [];

			return participants.filter(participant => {
				const eliminationWeek = eliminationData.get(participant.id);
				if (!eliminationWeek) return true;
				return eliminationWeek >= currentWeek;
			});
		} catch (error) {
			console.error('Error getting available participants:', error);
			setPageError(error instanceof Error ? error : new Error('Failed to load participants'));
			return [];
		}
	};

	useEffect(() => {
		setPredictions(prev => ({
			...prev,
			week: currentWeek
		}));
	}, [currentWeek]);

	useEffect(() => {
		if (existingPredictions.length > 0) {
			const newPredictions: WeeklyPrediction = {
				week: currentWeek,
				star_baker: "",
				technical_winner: "",
				eliminated: "",
				handshake: "",
				weekly_special: "",
			};

			existingPredictions.forEach(pred => {
				switch (pred.prediction_type) {
					case 'star_baker':
						newPredictions.star_baker = pred.participant_id;
						break;
					case 'technical_winner':
						newPredictions.technical_winner = pred.participant_id;
						break;
					case 'eliminated':
						newPredictions.eliminated = pred.participant_id;
						break;
					case 'handshake':
						newPredictions.handshake = pred.participant_id;
						break;
					case 'weekly_special':
						newPredictions.weekly_special = pred.participant_id;
						break;
					case 'winner':
						newPredictions.winner = pred.participant_id;
						// Winner is automatically also finalist1
						newPredictions.finalist1 = pred.participant_id;
						break;
					case 'finalist1':
						newPredictions.finalist1 = pred.participant_id;
						break;
					case 'finalist2':
						newPredictions.finalist2 = pred.participant_id;
						break;
					case 'finalist3':
						newPredictions.finalist3 = pred.participant_id;
						break;
				}
			});

			setPredictions(newPredictions);
		} else {
			setPredictions({
				week: currentWeek,
				star_baker: "",
				technical_winner: "",
				eliminated: "",
				handshake: "",
				weekly_special: "",
				winner: "",
				finalist1: "",
				finalist2: "",
				finalist3: "",
			});
		}
	}, [existingPredictions, currentWeek]);

	const handlePredictionChange = (category: keyof WeeklyPrediction, value: string) => {
		if (isLocked === true) {
			return;
		}

		setPredictions(prev => ({
			...prev,
			[category]: value
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!isAuthenticated) {
			setSaveError("Please log in to save predictions");
			return;
		}

		if (isLocked === true) {
			setSaveError("This week is locked. Predictions cannot be changed.");
			return;
		}

		try {
			setSaving(true);
			setSaveError(null);
			setSaveSuccess(false);

			await savePredictions(predictions);
			setSaveSuccess(true);

			setTimeout(() => setSaveSuccess(false), 3000);
		} catch (error) {
			setSaveError(error instanceof Error ? error.message : 'Failed to save predictions');
		} finally {
			setSaving(false);
		}
	};

	if (pageError) {
		const errorType = determineErrorType(pageError, 'predictions');
		const errorConfig = getErrorConfig(errorType);

		return (
			<AppLayout>
				<ErrorScreen
					error={pageError}
					title={errorConfig.title}
					message={errorConfig.message}
					showDetails={process.env.NODE_ENV === 'development'}
					onRetry={() => {
						setPageError(null);
						window.location.reload();
					}}
					onGoHome={() => {
						setPageError(null);
						window.location.href = '/';
					}}
				/>
			</AppLayout>
		);
	}

	if (authLoading || participantsLoading || predictionsLoading || lockLoading || summariesLoading) {
		return (
			<AppLayout>
				<div className="min-h-screen p-8">
					<div className="max-w-4xl mx-auto">
						<div className="text-center">
							<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
							<p className="text-gray-700 text-lg mt-4">Loading...</p>
						</div>
					</div>
				</div>
			</AppLayout>
		);
	}

	if (participantsError) {
		return (
			<AppLayout>
				<div className="min-h-screen p-8">
					<div className="max-w-4xl mx-auto">
						<div className="text-center">
							<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
								<strong>Error:</strong> {participantsError}
							</div>
						</div>
					</div>
				</div>
			</AppLayout>
		);
	}

	if (!isAuthenticated) {
		return (
			<AppLayout>
				<div className="min-h-screen p-8">
					<div className="max-w-4xl mx-auto">
						<div className="text-center">
							<div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
								<strong>Login Required:</strong> Please log in to make predictions.
							</div>
						</div>
					</div>
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout>
			<div className="min-h-screen p-8">
				<div className="max-w-4xl mx-auto">
					{/* Header */}
					<div className="text-center mb-8">
						<h1 className="text-4xl font-bold text-gray-800 mb-2">
							Weekly Predictions
						</h1>
						<p className="text-gray-700 text-lg">
							Make your predictions for Week {currentWeek}!
						</p>
					</div>

					{/* Week Lock Warning */}
					{isLocked === true && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
							<strong>⚠️ Week {currentWeek} is Locked:</strong> This week's predictions cannot be changed.
						</div>
					)}

					{/* Success/Error Messages */}
					{saveSuccess && (
						<div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
							<strong>Success!</strong> Your predictions for Week {currentWeek} have been saved.
						</div>
					)}

					{saveError && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
							<strong>Error:</strong> {saveError}
							<button
								onClick={() => setSaveError(null)}
								className="float-right font-bold"
							>
								×
							</button>
						</div>
					)}

					{/* Week Selector */}
					<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-2xl font-bold text-gray-800">Week {currentWeek} - {getWeekTheme(currentWeek).name}</h2>
							<div className="flex space-x-2">
								<button
									onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
									disabled={currentWeek === 0}
									className="px-4 py-2 bg-pastel-blue text-gray-800 rounded-lg font-medium hover:bg-pastel-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									← Previous Week
								</button>
								<button
									onClick={() => setCurrentWeek(currentWeek + 1)}
									className="px-4 py-2 bg-pastel-pink text-gray-800 rounded-lg font-medium hover:bg-pastel-pink-dark transition-colors"
								>
									Next Week →
								</button>
							</div>
						</div>
					</div>

					{/* Predictions Form */}
					<div className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30 ${isLocked === true ? 'opacity-75' : ''
						}`}>
						<form onSubmit={handleSubmit} className="space-y-8">
							{/* Week 0 Special Predictions - Winner + 2 Finalists */}
							{currentWeek === 0 && (
								<>
									{/* Overall Winner (also sets finalist1) */}
									<div className="bg-gradient-to-r from-yellow-200/30 to-yellow-100/20 rounded-xl p-6 border border-yellow-300/50">
										<div className="flex items-center mb-4">
											<span className="text-3xl mr-3">👑</span>
											<h3 className="text-xl font-bold text-gray-800">Winner</h3>
										</div>
										<p className="text-gray-600 mb-4">
											Who do you think will win the entire competition? (This person will also be counted as a finalist)
										</p>
										<select
											value={predictions.winner}
											onChange={(e) => {
												handlePredictionChange("winner", e.target.value);
												// Automatically set as finalist1 since winner is also a finalist
												handlePredictionChange("finalist1", e.target.value);
											}}
											disabled={isLocked === true}
											className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all bg-white text-gray-800 ${isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
												}`}
											required
										>
											<option value="">Select Overall Winner</option>
											{participants?.map((participant) => (
												<option key={participant.id} value={participant.id}>
													{participant.name}
												</option>
											))}
										</select>
									</div>

									{/* Overall Finalist #2 */}
									<div className="bg-gradient-to-r from-purple-200/30 to-purple-100/20 rounded-xl p-6 border border-purple-300/50">
										<div className="flex items-center mb-4">
											<span className="text-3xl mr-3">🥈</span>
											<h3 className="text-xl font-bold text-gray-800">Finalist #2</h3>
										</div>
										<p className="text-gray-600 mb-4">
											Who do you think will be the second finalist?
										</p>
										<select
											value={predictions.finalist2}
											onChange={(e) => handlePredictionChange("finalist2", e.target.value)}
											disabled={isLocked === true}
											className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all bg-white text-gray-800 ${isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
												}`}
											required
										>
											<option value="">Select Overall Finalist #2</option>
											{participants?.map((participant) => (
												<option key={participant.id} value={participant.id}>
													{participant.name}
												</option>
											))}
										</select>
									</div>

									{/* Overall Finalist #3 */}
									<div className="bg-gradient-to-r from-purple-200/30 to-purple-100/20 rounded-xl p-6 border border-purple-300/50">
										<div className="flex items-center mb-4">
											<span className="text-3xl mr-3">🥉</span>
											<h3 className="text-xl font-bold text-gray-800">Finalist #3</h3>
										</div>
										<p className="text-gray-600 mb-4">
											Who do you think will be the third finalist?
										</p>
										<select
											value={predictions.finalist3}
											onChange={(e) => handlePredictionChange("finalist3", e.target.value)}
											disabled={isLocked === true}
											className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all bg-white text-gray-800 ${isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
												}`}
											required
										>
											<option value="">Select Overall Finalist #3</option>
											{participants?.map((participant) => (
												<option key={participant.id} value={participant.id}>
													{participant.name}
												</option>
											))}
										</select>
									</div>
								</>
							)}
							
							{/* Regular Weekly Predictions - Only show for weeks 1+ */}
							{currentWeek > 0 && (
								<>
									{/* Star Baker */}
									<div className="bg-gradient-to-r from-pastel-blue/20 to-pastel-blue/10 rounded-xl p-6 border border-pastel-blue/30">
								<div className="flex items-center mb-4">
									<span className="text-3xl mr-3">⭐</span>
									<h3 className="text-xl font-bold text-gray-800">Star Baker</h3>
								</div>
								<p className="text-gray-600 mb-4">
									Who will be crowned Star Baker this week?
								</p>
								<select
									value={predictions.star_baker}
									onChange={(e) => handlePredictionChange("star_baker", e.target.value)}
									disabled={isLocked === true}
									className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800 ${isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									required
								>
									<option value="">Select Star Baker</option>
									{getAvailableParticipants().map((participant) => (
										<option key={participant.id} value={participant.id}>
											{participant.name}
										</option>
									))}
								</select>
							</div>

							{/* Technical Winner */}
							<div className="bg-gradient-to-r from-pastel-pink/20 to-pastel-pink/10 rounded-xl p-6 border border-pastel-pink/30">
								<div className="flex items-center mb-4">
									<span className="text-3xl mr-3">🏆</span>
									<h3 className="text-xl font-bold text-gray-800">Technical Challenge Winner</h3>
								</div>
								<p className="text-gray-600 mb-4">
									Who will triumph in the technical challenge?
								</p>
								<select
									value={predictions.technical_winner}
									onChange={(e) => handlePredictionChange("technical_winner", e.target.value)}
									disabled={isLocked === true}
									className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-pink focus:border-transparent transition-all bg-white text-gray-800 ${isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									required
								>
									<option value="">Select Technical Winner</option>
									{getAvailableParticipants().map((participant) => (
										<option key={participant.id} value={participant.id}>
											{participant.name}
										</option>
									))}
								</select>
							</div>

							{/* Eliminated */}
							<div className="bg-gradient-to-r from-red-100 to-red-50 rounded-xl p-6 border border-red-200">
								<div className="flex items-center mb-4">
									<span className="text-3xl mr-3">😢</span>
									<h3 className="text-xl font-bold text-gray-800">Eliminated</h3>
								</div>
								<p className="text-gray-600 mb-4">
									Who will be sent home this week?
								</p>
								<select
									value={predictions.eliminated}
									onChange={(e) => handlePredictionChange("eliminated", e.target.value)}
									disabled={isLocked === true}
									className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all bg-white text-gray-800 ${isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
										}`}
									required
								>
									<option value="">Select Eliminated Contestant</option>
									{getAvailableParticipants().map((participant) => (
										<option key={participant.id} value={participant.id}>
											{participant.name}
										</option>
									))}
								</select>
							</div>

							{/* Handshake */}
							<div className="bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-xl p-6 border border-yellow-200">
								<div className="flex items-center mb-4">
									<span className="text-3xl mr-3">🤝</span>
									<h3 className="text-xl font-bold text-gray-800">Hollywood Handshake</h3>
								</div>
								<p className="text-gray-600 mb-4">
									Who will receive the coveted handshake?
								</p>
								<select
									value={predictions.handshake}
									onChange={(e) => handlePredictionChange("handshake", e.target.value)}
									disabled={isLocked === true}
									className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all bg-white text-gray-800 ${isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
										}`}
								>
									<option value="">Select Handshake Recipient (Optional)</option>
									{getAvailableParticipants().map((participant) => (
										<option key={participant.id} value={participant.id}>
											{participant.name}
										</option>
									))}
								</select>
							</div>

							{/* Weekly Special */}
							<div className="bg-gradient-to-r from-purple-100 to-purple-50 rounded-xl p-6 border border-purple-200">
								<div className="flex items-center mb-4">
									<span className="text-3xl mr-3">✨</span>
									<h3 className="text-xl font-bold text-gray-800">Weekly Special</h3>
								</div>
								<p className="text-gray-600 mb-4">
									{getWeekTheme(currentWeek).weeklySpecial}
								</p>
								<select
									value={predictions.weekly_special}
									onChange={(e) => handlePredictionChange("weekly_special", e.target.value)}
									disabled={isLocked === true}
									className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all bg-white text-gray-800 ${isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
										}`}
								>
									<option value="">Select Weekly Special (Optional)</option>
									{getAvailableParticipants().map((participant) => (
										<option key={participant.id} value={participant.id}>
											{participant.name}
										</option>
									))}
								</select>
							</div>
								</>
							)}

							{/* Submit Button */}
							<div className="text-center pt-6">
								<button
									type="submit"
									disabled={saving || isLocked === true}
									className="bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-4 px-8 rounded-xl font-bold text-lg hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{saving ? 'Saving...' : isLocked === true ? 'Week Locked' : `Submit Week ${currentWeek} Predictions`}
								</button>
							</div>
						</form>
					</div>

					{/* Current Predictions Summary */}
					{Object.values(predictions).some(value => value !== "") && (
						<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mt-8 border border-white/30">
							<h3 className="text-xl font-bold text-gray-800 mb-4">Your Week {currentWeek} Predictions</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Week 0 Predictions - Winner + 2 Finalists */}
								{currentWeek === 0 && (
									<>
										{predictions.winner && (
											<div className="flex items-center space-x-3 p-3 bg-yellow-100 rounded-lg">
												<span className="text-2xl">👑</span>
												<span className="text-gray-700">
													<strong>Overall Winner:</strong> {participants.find(p => p.id === predictions.winner)?.name}
												</span>
											</div>
										)}
										{predictions.finalist2 && (
											<div className="flex items-center space-x-3 p-3 bg-purple-100 rounded-lg">
												<span className="text-2xl">🥈</span>
												<span className="text-gray-700">
													<strong>Overall Finalist #2:</strong> {participants.find(p => p.id === predictions.finalist2)?.name}
												</span>
											</div>
										)}
										{predictions.finalist3 && (
											<div className="flex items-center space-x-3 p-3 bg-purple-100 rounded-lg">
												<span className="text-2xl">🥉</span>
												<span className="text-gray-700">
													<strong>Overall Finalist #3:</strong> {participants.find(p => p.id === predictions.finalist3)?.name}
												</span>
											</div>
										)}
									</>
								)}
								
								{/* Regular Weekly Predictions - Only show for weeks 1+ */}
								{currentWeek > 0 && (
									<>
										{predictions.star_baker && (
									<div className="flex items-center space-x-3 p-3 bg-pastel-blue/20 rounded-lg">
										<span className="text-2xl">⭐</span>
										<span className="text-gray-700">
											<strong>Star Baker:</strong> {participants.find(p => p.id === predictions.star_baker)?.name}
										</span>
									</div>
								)}
								{predictions.technical_winner && (
									<div className="flex items-center space-x-3 p-3 bg-pastel-pink/20 rounded-lg">
										<span className="text-2xl">🏆</span>
										<span className="text-gray-700">
											<strong>Technical Winner:</strong> {participants.find(p => p.id === predictions.technical_winner)?.name}
										</span>
									</div>
								)}
								{predictions.eliminated && (
									<div className="flex items-center space-x-3 p-3 bg-red-100 rounded-lg">
										<span className="text-2xl">😢</span>
										<span className="text-gray-700">
											<strong>Eliminated:</strong> {participants.find(p => p.id === predictions.eliminated)?.name}
										</span>
									</div>
								)}
								{predictions.handshake && (
									<div className="flex items-center space-x-3 p-3 bg-yellow-100 rounded-lg">
										<span className="text-2xl">🤝</span>
										<span className="text-gray-700">
											<strong>Handshake:</strong> {participants.find(p => p.id === predictions.handshake)?.name}
										</span>
									</div>
								)}
								{predictions.weekly_special && (
									<div className="flex items-center space-x-3 p-3 bg-purple-100 rounded-lg">
										<span className="text-2xl">✨</span>
										<span className="text-gray-700">
											<strong>Weekly Special:</strong> {participants.find(p => p.id === predictions.weekly_special)?.name}
										</span>
									</div>
								)}
									</>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</AppLayout>
	);
}

export default function PredictionsPage() {
	return (
		<Suspense fallback={
			<AppLayout>
				<div className="min-h-screen p-8">
					<div className="max-w-6xl mx-auto">
						<div className="text-center">
							<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
							<p className="text-gray-700 text-lg mt-4">Loading predictions...</p>
						</div>
					</div>
				</div>
			</AppLayout>
		}>
			<PredictionsPageContent />
		</Suspense>
	);
}

